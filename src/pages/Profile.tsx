import React, { useEffect, useState } from 'react';
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
  IonButtons
} from '@ionic/react';
import {
  cogOutline,
  chevronForward,
  lockClosedOutline,
  shieldCheckmarkOutline,
  downloadOutline,
  trashOutline,
  closeOutline,
  logOutOutline
} from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { profileApi, ApiError, DonorProfile, ProfileStats } from '../services/api';
import './Profile.css';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

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

function eligibilityLabel(status: DonorProfile['eligibility_status']): { text: string; className: string } {
  switch (status) {
    case 'eligible':
      return { text: '✓ Eligible to donate', className: 'badge verified' };
    case 'deferred':
      return { text: '⚠ Deferred', className: 'badge deferred' };
    default:
      return { text: 'Profile incomplete', className: 'badge incomplete' };
  }
}

function nextEligibleLabel(profile: DonorProfile): string {
  if (profile.eligibility_status === 'eligible') return 'Eligible now';
  if (!profile.next_eligible_date) return 'Permanently deferred';
  return formatDate(profile.next_eligible_date);
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

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function loadProfile() {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await profileApi.get(token);
      setProfile(res.profile);
      setStats(res.stats);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  async function handleExportData() {
    if (!token) return;
    setExporting(true);
    try {
      const data = await profileApi.export(token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `my-donor-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setToastColor('success');
      setToastMessage('Your data export has downloaded.');
    } catch (err) {
      setToastColor('danger');
      setToastMessage(err instanceof ApiError ? err.message : 'Failed to export your data.');
    } finally {
      setExporting(false);
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
            <IonButton onClick={loadProfile}>Try again</IonButton>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const eligibility = eligibilityLabel(profile.eligibility_status);

  return (
    <IonPage>
      <IonContent fullscreen className="profile-content">
        <div className="profile-wrapper">

          {/* Header Bar */}
          <div className="topbar">
            <h1>My Profile</h1>
            <div className="icon-btn">
              <IonIcon icon={cogOutline} />
            </div>
          </div>

          {/* Identity Card */}
          <div className="identity-card">
            <div className="avatar">{profile.blood_type ?? '—'}</div>
            <h2 className="id-name">{profile.name}</h2>
            <p className="id-sub">Donor</p>
            <div className="id-badges">
              <span className={eligibility.className}>{eligibility.text}</span>
            </div>
          </div>

          {/* Eligibility Strip */}
          <div className="elig-strip">
            <span className="elig-dot"></span>
            <div className="elig-text">
              <div className="t">{eligibility.text.replace(/^[✓⚠]\s*/, '')}</div>
              <div className="s">Calculated from last donation · not editable</div>
            </div>
          </div>

          {/* Personal Info */}
          <div className="profile-section">
            <div className="section-head">
              <span className="section-title">Personal info</span>
              <a className="edit-link" href="#edit-personal">Edit</a>
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

          {/* Blood & Medical Profile */}
          <div className="profile-section">
            <div className="section-head">
              <span className="section-title">Blood & medical profile</span>
              <a className="edit-link" href="#edit-medical">Edit</a>
            </div>
            <div className="field-card">
              <div className="field-row">
                <span className="field-label">Blood type</span>
                <span className="field-value">{profile.blood_type ?? '—'}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Last donation</span>
                <span className="field-value">{formatDate(profile.last_donation_date)}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Next eligible date</span>
                <span className="field-value muted">{nextEligibleLabel(profile)}</span>
              </div>
            </div>
          </div>

          {/* Donation Record */}
          <div className="profile-section">
            <div className="section-head">
              <span className="section-title">Donation record</span>
              <a className="edit-link" href="#donation-history">View all</a>
            </div>
            <div className="field-card">
              <div className="field-row">
                <span className="field-label">Total donations</span>
                <span className="field-value">{stats.total_donations_count}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Total volume</span>
                <span className="field-value">{stats.total_units_donated.toLocaleString()} mL</span>
              </div>
              <div className="field-row">
                <span className="field-label">Donor level</span>
                <span className="field-value">{badgeEmoji(stats.badge_tier)} {stats.badge_tier} donor</span>
              </div>
            </div>
          </div>

          {/* Account & Privacy */}
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
              <div className="danger-row">
                <IonIcon icon={shieldCheckmarkOutline} />
                <span>Data privacy & consent</span>
                <IonIcon icon={chevronForward} className="chev" />
              </div>
              <div className="danger-row" onClick={handleExportData}>
                <IonIcon icon={downloadOutline} />
                <span>{exporting ? 'Exporting…' : 'Export my data'}</span>
                {exporting ? <IonSpinner name="dots" /> : <IonIcon icon={chevronForward} className="chev" />}
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