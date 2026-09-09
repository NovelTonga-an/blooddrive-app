import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonSpinner,
  RefresherEventDetail
} from '@ionic/react';
import { checkmarkCircle, personOutline, callOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ApiError,
  dashboardApi,
  DashboardResponse,
  driveApi,
  Drive,
  emergencyRequestApi,
  EmergencyRequestItem,
  donationHistoryApi,
  DonationHistoryEntry
} from '../services/api';
import './Dashboard.css';

function daysUntilNextEligible(lastDonationDate: string | null): number | null {
  if (!lastDonationDate) return null;

  const nextEligible = new Date(lastDonationDate);
  nextEligible.setDate(nextEligible.getDate() + 90);
  const diffDays = Math.ceil((nextEligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const history = useHistory();

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [emergencyRequests, setEmergencyRequests] = useState<EmergencyRequestItem[]>([]);
  const [drives, setDrives] = useState<Drive[]>([]);
  const [history_, setHistory] = useState<DonationHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [respondingRequestId, setRespondingRequestId] = useState<number | null>(null);
  const [respondingDriveId, setRespondingDriveId] = useState<number | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!token) return;

    try {
      const [dashboardRes, requestsRes, drivesRes, historyRes] = await Promise.all([
        dashboardApi.get(token),
        emergencyRequestApi.list(token),
        driveApi.list(token),
        donationHistoryApi.list(token),
      ]);
      setDashboard(dashboardRes);
      setEmergencyRequests(requestsRes.requests);
      setDrives(drivesRes.drives);
      setHistory(historyRes.history);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleRefresh(event: CustomEvent<RefresherEventDetail>) {
    await loadDashboard();
    event.detail.complete();
  }

  async function respondToEmergencyRequest(requestId: number, responseStatus: 'accepted' | 'declined') {
    if (!token) return;
    setRespondingRequestId(requestId);

    try {
      await emergencyRequestApi.respond(token, requestId, responseStatus);
      setEmergencyRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, my_response_status: responseStatus } : req))
      );
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to record your response.');
    } finally {
      setRespondingRequestId(null);
    }
  }

  async function respondToDrive(driveId: number, responseStatus: 'attending' | 'declined') {
    if (!token) return;
    setRespondingDriveId(driveId);

    try {
      await driveApi.respond(token, driveId, responseStatus);
      setDrives((prev) =>
        prev.map((drive) => (drive.id === driveId ? { ...drive, my_response_status: responseStatus } : drive))
      );
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to record your response.');
    } finally {
      setRespondingDriveId(null);
    }
  }

  const donor = dashboard?.donor;
  const stats = dashboard?.stats;
  const nextEligibleDays = donor ? daysUntilNextEligible(donor.last_donation_date) : null;
  const isEligible = donor?.eligibility_status === 'eligible';

  return (
    <IonPage>
      <IonContent fullscreen className="dashboard-content">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40%' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <div className="dashboard-wrapper">

            {/* Top Bar Header */}
            <div className="topbar">
              <div>
                <p className="greet-eyebrow">Welcome back</p>
                <h2 className="greet-name">Hi, {user?.name?.split(' ')[0] ?? donor?.name?.split(' ')[0] ?? 'Donor'} 👋</h2>
              </div>
            </div>

            {/* Signature Eligibility Ring Hero Card */}
            <div className="hero-card">
              <div className="ring-wrap">
                <svg width="84" height="84" viewBox="0 0 84 84">
                  <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="7"/>
                  <circle
                    cx="42"
                    cy="42"
                    r="36"
                    fill="none"
                    stroke={isEligible ? '#3FD684' : '#FFB020'}
                    strokeWidth="7"
                    strokeDasharray="226"
                    strokeDashoffset="14"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="ring-label">
                  <span className="type">{donor?.blood_type ?? '—'}</span>
                  <span className="sub">blood type</span>
                </div>
              </div>
              <div className="hero-text">
                <div className="hero-status">
                  <span className="status-dot" style={{ background: isEligible ? '#3fd684' : '#FFB020' }}></span>
                  {donor?.eligibility_status === 'eligible' && 'Eligible now'}
                  {donor?.eligibility_status === 'deferred' && 'Deferred'}
                  {donor?.eligibility_status === 'incomplete' && 'Profile incomplete'}
                </div>
                <p className="hero-title">
                  {isEligible ? 'You can save a life today' : 'Thanks for being a donor'}
                </p>
                <p className="hero-sub">
                  {donor?.last_donation_date
                    ? `Last donation: ${formatDate(donor.last_donation_date)} · ${stats?.total_donations_count ?? 0} total donations`
                    : 'No donations recorded yet'}
                </p>
              </div>
            </div>

            {/* Emergency Blood Requests Section */}
            <div className="dashboard-section">
              <div className="section-head">
                <h3 className="section-title">Emergency requests</h3>
                <a className="section-link" onClick={() => history.push('/app/requests')}>See all</a>
              </div>

              {emergencyRequests.length === 0 && (
                <p className="hero-sub" style={{ color: 'var(--bd-muted)' }}>No emergency requests right now.</p>
              )}

              {emergencyRequests.slice(0, 2).map((req) => (
                <div key={req.id} className="req-card moderate">
                  <div className="req-top">
                    <div>
                      {/* Patient Name */}
                      <h4 className="req-title" style={{ margin: '2px 0 4px' }}>
                        Patient: {req.patient_name}
                      </h4>
                      <p className="req-meta">{req.hospital_venue} · {req.barangay_name ?? 'Cervantes'}</p>
                      <p className="req-meta">{req.units_needed} unit(s) needed</p>
                    </div>
                    <div className="req-type">{req.blood_type}</div>
                  </div>

                  {/* Requester / Contact Info Details */}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <p className="req-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0' }}>
                      <IonIcon icon={personOutline} style={{ fontSize: '0.9rem' }} /> Requester: <strong>{req.contact_person}</strong>
                    </p>
                    <p className="req-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0' }}>
                      <IonIcon icon={callOutline} style={{ fontSize: '0.9rem' }} /> Contact No.:{' '}
                      <a href={`tel:${req.contact_number}`} style={{ color: 'var(--ion-color-primary, #b3122b)', fontWeight: 600, textDecoration: 'none' }}>
                        {req.contact_number}
                      </a>
                    </p>
                  </div>

                  {req.my_response_status === 'not_responded' ? (
                    <div className="req-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={respondingRequestId === req.id}
                        onClick={() => respondToEmergencyRequest(req.id, 'declined')}
                      >
                        Not available
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={respondingRequestId === req.id}
                        onClick={() => respondToEmergencyRequest(req.id, 'accepted')}
                      >
                        I can help
                      </button>
                    </div>
                  ) : (
                    <p className={`req-status-note ${req.my_response_status === 'accepted' ? 'accepted' : 'declined'}`}>
                      {req.my_response_status === 'accepted' && 'You confirmed you can help'}
                      {req.my_response_status === 'declined' && 'You marked yourself unavailable'}
                      {req.my_response_status === 'arrived' && 'You arrived to donate — thank you!'}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Upcoming Blood Donation Drives Horizontal Scroll */}
            <div className="dashboard-section">
              <div className="section-head">
                <h3 className="section-title">Upcoming drives for you</h3>
                <a className="section-link" onClick={() => history.push('/app/drives')}>See all</a>
              </div>

              {drives.length === 0 && (
                <p className="hero-sub" style={{ color: 'var(--bd-muted)' }}>No upcoming drives scheduled.</p>
              )}

              <div className="drive-scroll">
                {drives.slice(0, 4).map((drive) => {
                  const driveDate = new Date(drive.drive_date);

                  return (
                    <div key={drive.id} className="drive-card">
                      <div className="drive-date">
                        <div className="date-box">
                          <span className="d">{driveDate.getDate()}</span>
                          <span className="m">{driveDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                        </div>
                      </div>
                      <h5 className="drive-name">{drive.title}</h5>
                      <p className="drive-loc">{drive.venue}</p>

                      {drive.my_response_status === 'not_responded' || drive.my_response_status === 'pending' ? (
                        <>
                          <button
                            type="button"
                            className="drive-btn"
                            disabled={respondingDriveId === drive.id}
                            onClick={() => respondToDrive(drive.id, 'attending')}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            className="drive-decline-link"
                            disabled={respondingDriveId === drive.id}
                            onClick={() => respondToDrive(drive.id, 'declined')}
                          >
                            Can't make it
                          </button>
                        </>
                      ) : (
                        <p className={`drive-status-note ${drive.my_response_status === 'attending' ? 'good' : 'muted'}`}>
                          {drive.my_response_status === 'attending' ? "You're confirmed" : 'You declined'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Donors Stats Grid */}
            <div className="dashboard-section">
              <IonGrid className="ion-no-padding">
                <IonRow className="stats-row">
                  <IonCol size="4">
                    <div className="stat-card">
                      <div className="stat-num">{stats?.total_donations_count ?? 0}</div>
                      <div className="stat-label">Donations made</div>
                    </div>
                  </IonCol>
                  <IonCol size="4">
                    <div className="stat-card">
                      <div className="stat-num">~{(stats?.total_donations_count ?? 0) * 3}</div>
                      <div className="stat-label">Lives impacted</div>
                    </div>
                  </IonCol>
                  <IonCol size="4">
                    <div className="stat-card">
                      <div className="stat-num">{isEligible ? 'Now' : `${nextEligibleDays ?? 0}d`}</div>
                      <div className="stat-label">Until next eligible</div>
                    </div>
                  </IonCol>
                </IonRow>
              </IonGrid>
            </div>

            {/* Donation History List */}
            <div className="dashboard-section">
              <div className="section-head">
                <h3 className="section-title">Donation history</h3>
              </div>

              {history_.length === 0 && (
                <p className="hero-sub" style={{ color: 'var(--bd-muted)' }}>No donations recorded yet.</p>
              )}

              {history_.slice(0, 5).map((entry) => (
                <div key={entry.id} className="hist-row">
                  <div className="hist-icon">
                    <IonIcon icon={checkmarkCircle} />
                  </div>
                  <div className="hist-info">
                    <div className="t">{entry.drive_title ?? entry.facility_name}</div>
                    <div className="s">{formatDate(entry.donation_date)} · {entry.units_donated * 450} mL</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <IonToast
          isOpen={!!toastMessage}
          message={toastMessage ?? ''}
          duration={3000}
          onDidDismiss={() => setToastMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Dashboard;