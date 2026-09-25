import React, { useEffect, useState, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonSpinner,
  IonModal,
  IonInput,
  IonButton,
  IonToast,
  IonItem,
  IonLabel,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonSelect,
  IonSelectOption
} from '@ionic/react';
import {
  chevronForward,
  lockClosedOutline,
  trashOutline,
  closeOutline,
  logOutOutline
} from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { profileApi, lookupApi, ApiError, DonorProfile, ProfileStats, LookupOption } from '../services/api';
import './Profile.css';

function formatBirthdate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const ageDiff = Date.now() - d.getTime();
  const age = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
  const formatted = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return `${formatted} (${age} yrs)`;
}

function capitalize(value: string | null): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function badgeEmoji(tier: string): string {
  switch (tier.toLowerCase()) {
    case 'gold':
      return '🥇';
    case 'silver':
      return '🥈';
    default:
      return '🥉';
  }
}

function daysUntilNextEligible(lastDonationDate: string | null): number | null {
  if (!lastDonationDate) return null;
  const nextEligible = new Date(lastDonationDate);
  nextEligible.setDate(nextEligible.getDate() + 90);
  const diffDays = Math.ceil((nextEligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

const Profile: React.FC = () => {
  const { token, logout } = useAuth();
  const history = useHistory();

  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

  // Edit Personal Info Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBarangayId, setEditBarangayId] = useState<number | null>(null);
  const [barangays, setBarangays] = useState<LookupOption[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [res, barangaysRes] = await Promise.all([
        profileApi.get(token),
        lookupApi.barangays(),
      ]);
      setProfile(res.profile);
      setStats(res.stats);
      setBarangays(barangaysRes);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  function openEditModal() {
    if (!profile) return;
    setEditName(profile.name);
    setEditPhone(profile.phone_number ?? '');
    setEditError(null);
    setShowEditModal(true);
  }

  async function handleSaveProfile() {
    if (!token) return;
    setEditError(null);
    setSavingProfile(true);

    try {
      await profileApi.update(token, {
        name: editName,
        phone_number: editPhone || null,
        barangay_id: editBarangayId,
      });
      setShowEditModal(false);
      setToastColor('success');
      setToastMessage('Personal info updated successfully.');
      await loadProfile();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Failed to update personal info.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!token) return;
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await profileApi.updatePassword(token, {
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setToastColor('success');
      setToastMessage('Password updated successfully.');
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Failed to update password.');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!token) return;
    setDeleteError(null);
    setDeleting(true);
    try {
      await profileApi.deleteAccount(token, { password: deletePassword });
      await logout();
      history.replace('/login');
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Failed to delete your account.');
      setDeleting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      history.replace('/login');
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  }

  if (loading) {
    return (
      <IonPage>
        <IonContent fullscreen className="profile-content">
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (loadError || !profile || !stats) {
    return (
      <IonPage>
        <IonContent fullscreen className="profile-content">
          <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px' }}>
            <p>{loadError ?? 'Something went wrong loading your profile.'}</p>
            <IonButton onClick={() => loadProfile()}>Try again</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const nextEligibleDays = daysUntilNextEligible(profile.last_donation_date);
  const isEligible = profile.eligibility_status === 'eligible';

  return (
    <IonPage>
      <IonContent fullscreen className="profile-content">
        <div className="profile-wrapper">

          {/* Header Bar (Gear icon removed) */}
          <div className="topbar">
            <h1>My Profile</h1>
          </div>

          {/* Identity Card */}
          <div className="identity-card">
            <div className="avatar">{profile.blood_type ?? '—'}</div>
            <h2 className="id-name">{profile.name}</h2>
            <p className="id-sub">Donor</p>
            <div className="id-badges">
              <span className="badge verified">
                {isEligible ? 'Eligible to donate now' : `Eligible to donate again in ${nextEligibleDays ?? 0} day(s)`}
              </span>
            </div>
          </div>

          {/* Personal Info */}
          <div className="profile-section">
            <div className="section-head">
              <span className="section-title">Personal info</span>
              <a className="edit-link" onClick={openEditModal} style={{ cursor: 'pointer' }}>Edit</a>
            </div>
            <div className="field-card">
              <div className="field-row">
                <span className="field-label">Full name</span>
                <span className="field-value">{profile.name}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Date of birth</span>
                <span className="field-value">{formatBirthdate(profile.birthdate)}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Gender</span>
                <span className="field-value">{capitalize(profile.gender)}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Mobile number</span>
                <span className="field-value">{profile.phone_number ?? '—'}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Email</span>
                <span className="field-value">{profile.email}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Address</span>
                <span className="field-value">{profile.address ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Blood & Medical Profile (Edit button removed) */}
          <div className="profile-section">
            <div className="section-head">
              <span className="section-title">Blood & medical profile</span>
            </div>
            <div className="field-card">
              <div className="field-row">
                <span className="field-label">Blood type</span>
                <span className="field-value">{profile.blood_type ?? '—'}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Last donation</span>
                <span className="field-value">{profile.last_donation_date ? new Date(profile.last_donation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Next eligible date</span>
                <span className="field-value muted">{profile.next_eligible_date ? new Date(profile.next_eligible_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Eligible now'}</span>
              </div>
            </div>
          </div>

          {/* Donation Record */}
          <div className="profile-section">
            <div className="section-head">
              <span className="section-title">Donation record</span>
              <a className="edit-link" onClick={() => history.push('/app/home')} style={{ cursor: 'pointer' }}>View all</a>
            </div>
            <div className="field-card">
              <div className="field-row">
                <span className="field-label">Total donations</span>
                <span className="field-value">{stats.total_donations_count}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Successful donations (450 mL)</span>
                <span className="field-value">{stats.successful_donations_count}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Donor level</span>
                <span className="field-value">{badgeEmoji(stats.badge_tier)} {stats.badge_tier} donor</span>
              </div>
            </div>
          </div>

          {/* Account & Privacy (Data privacy & export buttons removed) */}
          <div className="profile-section">
            <div className="section-head">
              <span className="section-title">Account & privacy</span>
            </div>
            <div className="danger-card">
              <div className="danger-row" onClick={() => setShowPasswordModal(true)}>
                <IonIcon icon={lockClosedOutline} />
                <span>Change password</span>
                <IonIcon icon={chevronForward} className="chev" />
              </div>
              <div className="danger-row delete-row" onClick={() => setShowDeleteModal(true)}>
                <IonIcon icon={trashOutline} />
                <span>Delete account</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="profile-section">
            <IonButton
              expand="block"
              fill="outline"
              color="medium"
              onClick={() => setShowLogoutModal(true)}
            >
              <IonIcon icon={logOutOutline} slot="start" />
              Log out
            </IonButton>
          </div>

          <p className="footer-note">App version 1.4.2 · Terms · Privacy Policy</p>

        </div>
      </IonContent>

      {/* Edit Personal Info Modal */}
      <IonModal isOpen={showEditModal} onDidDismiss={() => setShowEditModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Edit personal info</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowEditModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Full name</IonLabel>
            <IonInput
              value={editName}
              onIonInput={(e) => setEditName(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Mobile number</IonLabel>
            <IonInput
              value={editPhone}
              onIonInput={(e) => setEditPhone(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Barangay</IonLabel>
            <IonSelect
              value={editBarangayId}
              placeholder="Select barangay"
              onIonChange={(e) => setEditBarangayId(e.detail.value)}
            >
              {barangays.map((b) => (
                <IonSelectOption key={b.id} value={b.id}>{b.name}</IonSelectOption>
              ))}
            </IonSelect>
          </IonItem>
          {editError && <p style={{ color: 'var(--ion-color-danger, #eb445a)', marginTop: '12px' }}>{editError}</p>}
          <IonButton
            expand="block"
            style={{ marginTop: '20px' }}
            disabled={savingProfile || !editName}
            onClick={handleSaveProfile}
          >
            {savingProfile ? <IonSpinner name="dots" /> : 'Save changes'}
          </IonButton>
        </IonContent>
      </IonModal>

      {/* Change Password Modal */}
      <IonModal isOpen={showPasswordModal} onDidDismiss={() => setShowPasswordModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Change password</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowPasswordModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <IonItem>
            <IonLabel position="stacked">Current password</IonLabel>
            <IonInput
              type="password"
              value={currentPassword}
              onIonInput={(e) => setCurrentPassword(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">New password</IonLabel>
            <IonInput
              type="password"
              value={newPassword}
              onIonInput={(e) => setNewPassword(e.detail.value ?? '')}
            />
          </IonItem>
          <IonItem>
            <IonLabel position="stacked">Confirm new password</IonLabel>
            <IonInput
              type="password"
              value={confirmPassword}
              onIonInput={(e) => setConfirmPassword(e.detail.value ?? '')}
            />
          </IonItem>
          {passwordError && <p style={{ color: 'var(--ion-color-danger, #eb445a)', marginTop: '12px' }}>{passwordError}</p>}
          <IonButton
            expand="block"
            style={{ marginTop: '20px' }}
            disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
            onClick={handleChangePassword}
          >
            {passwordSaving ? <IonSpinner name="dots" /> : 'Update password'}
          </IonButton>
        </IonContent>
      </IonModal>

      {/* Delete Account Modal */}
      <IonModal isOpen={showDeleteModal} onDidDismiss={() => setShowDeleteModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Delete account</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowDeleteModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>
            This permanently deletes your account and all donation history. This action
            cannot be undone. Enter your password to confirm.
          </p>
          <IonItem>
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput
              type="password"
              value={deletePassword}
              onIonInput={(e) => setDeletePassword(e.detail.value ?? '')}
            />
          </IonItem>
          {deleteError && <p style={{ color: 'var(--ion-color-danger, #eb445a)', marginTop: '12px' }}>{deleteError}</p>}
          <IonButton
            expand="block"
            color="danger"
            style={{ marginTop: '20px' }}
            disabled={deleting || !deletePassword}
            onClick={handleDeleteAccount}
          >
            {deleting ? <IonSpinner name="dots" /> : 'Permanently delete my account'}
          </IonButton>
        </IonContent>
      </IonModal>

      {/* Logout Confirmation Modal */}
      <IonModal isOpen={showLogoutModal} onDidDismiss={() => setShowLogoutModal(false)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Log out</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowLogoutModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Are you sure you want to log out of your account?</p>
          <IonButton expand="block" color="medium" disabled={loggingOut} onClick={handleLogout}>
            {loggingOut ? <IonSpinner name="dots" /> : 'Log out'}
          </IonButton>
          <IonButton expand="block" fill="clear" onClick={() => setShowLogoutModal(false)}>
            Cancel
          </IonButton>
        </IonContent>
      </IonModal>

      <IonToast
        isOpen={!!toastMessage}
        message={toastMessage ?? ''}
        duration={2500}
        color={toastColor}
        onDidDismiss={() => setToastMessage(null)}
      />
    </IonPage>
  );
};

export default Profile;