// Local dev: Laravel served via `php artisan serve` (http://localhost:8000).
// If testing on a physical device/emulator, replace 'localhost' with your machine's LAN IP.
export const API_BASE_URL = 'https://darkgoldenrod-spoonbill-897628.hostingersite.com/api';

export class ApiError extends Error {
  status: number;
  data?: any;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, data?: any, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    this.errors = errors;
  }
}

interface ApiRequestOptions extends RequestInit {
  token?: string | null;
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message ?? 'Something went wrong. Please try again.';
    throw new ApiError(message, response.status, data, data?.errors);
  }

  return data as T;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone_number: string | null;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone_number: string;
  password: string;
  password_confirmation: string;
  blood_type_id: number;
  barangay_id?: number | null;
  birthdate: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
}

export interface LoginPayload {
  login_identifier: string;
  password: string;
}

export interface LookupOption {
  id: number;
  name: string;
}

export const authApi = {
  register: (payload: RegisterPayload) =>
    apiRequest<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    apiRequest<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  logout: (token: string) =>
    apiRequest<{ message: string }>('/logout', {
      method: 'POST',
      token,
    }),

  me: (token: string) =>
    apiRequest<{ user: AuthUser }>('/me', {
      method: 'GET',
      token,
    }),
};

export const lookupApi = {
  bloodTypes: () => apiRequest<LookupOption[]>('/blood-types', { method: 'GET' }),
  barangays: () => apiRequest<LookupOption[]>('/barangays', { method: 'GET' }),
};

export interface Drive {
  id: number;
  title: string;
  description: string | null;
  drive_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  target_units: number;
  status: string;
  my_response_status: 'attending' | 'declined' | 'pending' | 'not_responded';
}

export const driveApi = {
  list: (token: string) =>
    apiRequest<{ drives: Drive[] }>('/donation-drives', { method: 'GET', token }),

  respond: (token: string, driveId: number, responseStatus: 'attending' | 'declined') =>
    apiRequest<{ message: string; response_status: string }>(`/donation-drives/${driveId}/respond`, {
      method: 'POST',
      token,
      body: JSON.stringify({ response_status: responseStatus }),
    }),
};

export interface DashboardDonor {
  name: string;
  blood_type: string | null;
  eligibility_status: 'eligible' | 'deferred' | 'incomplete';
  last_donation_date: string | null;
}

export interface DashboardStats {
  total_donations_count: number;
  total_units_donated: number;
  badge_tier: string;
}

export interface DashboardResponse {
  donor: DashboardDonor;
  stats: DashboardStats;
}

export const dashboardApi = {
  get: (token: string) => apiRequest<DashboardResponse>('/dashboard', { method: 'GET', token }),
};

export interface EmergencyRequestItem {
  id: number;
  patient_name: string;
  hospital_venue: string;
  units_needed: number;
  contact_person: string;
  contact_number: string;
  created_at: string;
  blood_type: string;
  barangay_name: string | null;
  my_response_status: 'accepted' | 'declined' | 'arrived' | 'not_responded';
}

export const emergencyRequestApi = {
  list: (token: string) =>
    apiRequest<{ requests: EmergencyRequestItem[] }>('/emergency-requests', { method: 'GET', token }),

  respond: (token: string, requestId: number, responseStatus: 'accepted' | 'declined') =>
    apiRequest<{ message: string; response_status: string }>(`/emergency-requests/${requestId}/respond`, {
      method: 'POST',
      token,
      body: JSON.stringify({ response_status: responseStatus }),
    }),
};

export interface DonationHistoryEntry {
  id: number;
  donation_date: string;
  units_donated: number;
  facility_name: string;
  drive_title: string | null;
}

export const donationHistoryApi = {
  list: (token: string) =>
    apiRequest<{ history: DonationHistoryEntry[] }>('/donation-history', { method: 'GET', token }),
};

export interface MyEmergencyRequestItem {
  id: number;
  patient_name: string;
  hospital_venue: string;
  units_needed: number;
  image_path?: string | null;
  status: 'pending' | 'broadcasting' | 'fulfilled' | 'cancelled';
  created_at: string;
  approved_at: string | null;
  blood_type: string;
  barangay_name: string | null;
  notified_count: number;
  sent_count: number;
  accepted_count: number;
  declined_count: number;
  arrived_count: number;
}

export interface NotifiedDonor {
  donor_id: number;
  name: string;
  blood_type: string | null;
  notification_status: 'pending' | 'sent' | 'failed';
  response_status: 'accepted' | 'declined' | 'arrived' | 'not_responded';
}

export interface MyEmergencyRequestDetail extends MyEmergencyRequestItem {
  contact_person: string;
  contact_number: string;
  requested_by_user_id: number;
  is_verified: boolean;
}

export const myEmergencyRequestApi = {
  list: (token: string) =>
    apiRequest<MyEmergencyRequestItem[]>('/my-emergency-requests', { method: 'GET', token }),

  show: (token: string, requestId: number) =>
    apiRequest<{ request: MyEmergencyRequestDetail; donors: NotifiedDonor[] }>(
      `/my-emergency-requests/${requestId}`,
      { method: 'GET', token }
    ),

  create: async (
    token: string,
    formData: FormData
  ): Promise<{ message: string; request_id: number; requires_approval: boolean; notified_count: number }> => {
    const response = await fetch(`${API_BASE_URL}/my-emergency-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.message ?? 'Failed to submit emergency request.';
      throw new ApiError(message, response.status, data, data?.errors);
    }

    return data;
  },

  fulfill: (token: string, requestId: number) =>
    apiRequest<{ message: string }>(`/my-emergency-requests/${requestId}/fulfill`, {
      method: 'PATCH',
      token,
    }),
};

export interface DonorProfile {
  name: string;
  birthdate: string;
  gender: 'male' | 'female' | 'other';
  phone_number: string | null;
  email: string;
  address: string | null;
  blood_type: string | null;
  eligibility_status: 'eligible' | 'deferred' | 'incomplete';
  last_donation_date: string | null;
  next_eligible_date: string | null;
}

export interface ProfileStats {
  total_donations_count: number;
  total_units_donated: number;
  badge_tier: string;
}

export interface ProfileResponse {
  profile: DonorProfile;
  stats: ProfileStats;
}

export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}

export interface DeleteAccountPayload {
  password: string;
}

export interface LocationPayload {
  latitude: number;
  longitude: number;
  barangay_id?: number | null;
}

export const profileApi = {
  get: (token: string) => apiRequest<ProfileResponse>('/profile', { method: 'GET', token }),

  updatePassword: (token: string, payload: UpdatePasswordPayload) =>
    apiRequest<{ message: string }>('/profile/password', {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),

  updateLocation: (token: string, payload: LocationPayload) =>
    apiRequest<{ message: string; latitude: number; longitude: number }>('/profile/location', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),

  export: (token: string) => apiRequest<Record<string, unknown>>('/profile/export', { method: 'GET', token }),

  deleteAccount: (token: string, payload: DeleteAccountPayload) =>
    apiRequest<{ message: string }>('/profile', {
      method: 'DELETE',
      token,
      body: JSON.stringify(payload),
    }),
};