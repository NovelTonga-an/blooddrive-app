import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonSpinner,
  IonToast,
  IonButton,
  IonModal
} from '@ionic/react';
import { arrowBackOutline, ellipsisHorizontal, locationOutline, closeOutline, warningOutline, callOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { ApiError, myEmergencyRequestApi, MyEmergencyRequestDetail, NotifiedDonor } from '../../services/api';
import './Requests.css';

// Fix Leaflet default marker icon asset paths
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

const customMarkerIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function responseStatusLabel(status: NotifiedDonor['response_status']): { label: string; className: string } {
  switch (status) {
    case 'accepted':
    case 'arrived':
      return { label: 'Willing', className: 'willing' };
    case 'declined':
      return { label: 'Not available', className: 'declined' };
    default:
      return { label: 'No response yet', className: 'waiting' };
  }
}

const RequestDetail: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [request, setRequest] = useState<MyEmergencyRequestDetail | null>(null);
  const [donors, setDonors] = useState<NotifiedDonor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [donorOutcomes, setDonorOutcomes] = useState<Record<number, 'donated' | 'no_show'>>({});

  const loadRequest = useCallback(async () => {
    if (!token) return;

    try {
      const response = await myEmergencyRequestApi.show(token, Number(id));
      setRequest(response.request);
      setDonors(response.donors);

      const initialOutcomes: Record<number, 'donated' | 'no_show'> = {};
      response.donors.forEach((d) => {
        if (d.response_status === 'accepted' || d.response_status === 'arrived') {
          initialOutcomes[d.donor_id] = d.outcome ?? 'donated';
        }
      });
      setDonorOutcomes(initialOutcomes);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to load this request.');
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  const handleOutcomeChange = (donorId: number, outcome: 'donated' | 'no_show') => {
    setDonorOutcomes((prev) => ({ ...prev, [donorId]: outcome }));
  };

  async function handleConfirmFulfill() {
    if (!token || !request) return;

    const outcomesArray = Object.entries(donorOutcomes).map(([donorId, outcome]) => ({
      donor_id: Number(donorId),
      outcome,
    }));

    const donatedCount = outcomesArray.filter((item) => item.outcome === 'donated').length;
    // Units stated must match or exceed the willing donors marked as donated
    if (donatedCount < request.units_needed) {
      setToastMessage(`You must mark at least ${request.units_needed} donor(s) as "Donated" to match or exceed the units requested (${donatedCount}/${request.units_needed}).`);
      return;
    }

    setIsFulfilling(true);
    try {
      await myEmergencyRequestApi.fulfill(token, request.id, outcomesArray);
      setShowFulfillModal(false);
      setToastMessage('Request updated and marked as fulfilled successfully.');
      await loadRequest();
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to fulfill this request.');
    } finally {
      setIsFulfilling(false);
    }
  }

  if (isLoading) {
    return (
      <IonPage>
        <IonContent fullscreen className="requests-content">
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40%' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!request) {
    return (
      <IonPage>
        <IonContent fullscreen className="requests-content">
          <div className="requests-wrapper">
            <div className="topbar">
              <div className="icon-btn" onClick={() => history.goBack()}>
                <IonIcon icon={arrowBackOutline} />
              </div>
              <h1>My request</h1>
              <div style={{ width: 38 }}></div>
            </div>
            <p className="status-meta">This request could not be loaded.</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const willingDonors = donors.filter((d) => d.response_status === 'accepted' || d.response_status === 'arrived');
  const declinedCount = donors.filter((d) => d.response_status === 'declined').length;
  const currentDonatedCount = Object.values(donorOutcomes).filter(o => o === 'donated').length;

  const lat = Number(request.latitude);
  const lng = Number(request.longitude);
  const hasCoords = request.latitude !== null && request.longitude !== null && !isNaN(lat) && !isNaN(lng);

  return (
    <IonPage>
      <IonContent fullscreen className="requests-content">
        <div className="requests-wrapper">

          <div className="topbar">
            <div className="icon-btn" onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </div>
            <h1>Request detail</h1>
            <div className="icon-btn">
              <IonIcon icon={ellipsisHorizontal} />
            </div>
          </div>

          <div className="detail-hero">
            <p className="detail-status">
              {request.status === 'pending' && 'Pending verification'}
              {request.status === 'broadcasting' && 'Verified · Live'}
              {request.status === 'fulfilled' && 'Fulfilled'}
              {request.status === 'cancelled' && 'Cancelled'}
            </p>
            <h2 className="detail-title">{request.patient_name} · {request.blood_type} needed</h2>
            <p className="detail-sub">{request.hospital_venue} · {request.units_needed} units needed</p>
          </div>

          {hasCoords && (
            <div style={{ marginTop: '16px' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={locationOutline} style={{ color: '#B3122B' }} /> Pinned Extraction Venue
              </h3>
              <div style={{ height: '200px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ccc', marginTop: '8px' }}>
                <MapContainer center={[lat, lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <Marker position={[lat, lng]} icon={customMarkerIcon}>
                    <Popup>
                      <strong>{request.hospital_venue}</strong><br />
                      Patient: {request.patient_name}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          )}

          <h3 className="section-title" style={{ marginTop: '18px' }}>Status timeline</h3>
          <div className="timeline">
            <div className="tl-step">
              <div className="tl-marker">
                <div className="tl-dot done">✓</div>
                <div className="tl-line done"></div>
              </div>
              <div className="tl-content">
                <p className="tl-title">Submitted</p>
                <p className="tl-time">{new Date(request.created_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="tl-step">
              <div className="tl-marker">
                <div className={`tl-dot ${request.is_verified ? 'done' : 'pending'}`}>{request.is_verified ? '✓' : '2'}</div>
                <div className={`tl-line ${request.is_verified ? 'done' : ''}`}></div>
              </div>
              <div className="tl-content">
                <p className="tl-title">Verified by RHU staff</p>
                <p className="tl-time">
                  {request.is_verified && request.approved_at
                    ? new Date(request.approved_at).toLocaleString()
                    : 'Waiting for verification'}
                </p>
              </div>
            </div>

            <div className="tl-step">
              <div className="tl-marker">
                <div className={`tl-dot ${request.sent_count > 0 ? 'done' : 'pending'}`}>{request.sent_count > 0 ? '✓' : '3'}</div>
                <div className={`tl-line ${request.status === 'fulfilled' ? 'done' : ''}`}></div>
              </div>
              <div className="tl-content">
                <p className="tl-title">Notifications sent</p>
                <p className="tl-time">
                  {request.sent_count > 0 ? `${request.sent_count} donors notified` : 'Not sent yet'}
                </p>
              </div>
            </div>

            <div className="tl-step">
              <div className="tl-marker">
                <div className={`tl-dot ${request.status === 'fulfilled' ? 'done' : 'pending'}`}>
                  {request.status === 'fulfilled' ? '✓' : '4'}
                </div>
              </div>
              <div className="tl-content">
                <p className={`tl-title ${request.status === 'fulfilled' ? '' : 'pending'}`}>Fulfilled</p>
                <p className="tl-time">
                  {request.status === 'fulfilled'
                    ? 'This request has been fulfilled'
                    : `${willingDonors.filter(d => donorOutcomes[d.donor_id] === 'donated').length} of ${request.units_needed} units confirmed`}
                </p>
              </div>
            </div>
          </div>

          {request.status === 'broadcasting' && (
            <IonButton
              expand="block"
              className="submit-btn"
              style={{ marginTop: '16px' }}
              onClick={() => setShowFulfillModal(true)}
            >
              Update Willing Donors
            </IonButton>
          )}

          <h3 className="section-title" style={{ marginTop: '18px' }}>Donors notified</h3>
          <div className="notified-summary">
            <div className="ns-card">
              <div className="ns-num">{donors.length}</div>
              <div className="ns-label">Notified</div>
            </div>
            <div className="ns-card">
              <div className="ns-num good">{willingDonors.length}</div>
              <div className="ns-label">Willing</div>
            </div>
            <div className="ns-card">
              <div className="ns-num crimson">{declinedCount}</div>
              <div className="ns-label">Declined</div>
            </div>
          </div>

          {donors.length === 0 && (
            <p className="status-meta" style={{ padding: '12px 4px' }}>No donors have been notified yet.</p>
          )}

          <div className="donor-card-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
            {donors.map((donor) => {
              const status = responseStatusLabel(donor.response_status);

              return (
                <div key={donor.donor_id} className="donor-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="donor-avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#B3122B', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                      {donor.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="donor-info">
                      <div className="donor-name" style={{ fontWeight: 600, color: '#1B2430' }}>{donor.name}</div>
                      <div className="donor-meta" style={{ fontSize: '0.8rem', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontWeight: 700, color: '#B3122B' }}>{donor.blood_type ?? '—'}</span>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <IonIcon icon={callOutline} style={{ fontSize: '11px' }} /> {donor.phone_number ?? 'No contact'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`donor-status ${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>

        </div>

        {/* Improved Verify Donor Outcomes Modal */}
        <IonModal isOpen={showFulfillModal} onDidDismiss={() => setShowFulfillModal(false)}>
          <div style={{ padding: '20px', height: '100%', display: 'flex', flexDirection: 'column', background: '#F8F9FA' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1B2430' }}>
                  Verify Donor Outcomes
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#B3122B', fontWeight: 600 }}>
                  Units Needed: {request.units_needed} · Marked Donated: {currentDonatedCount}
                </span>
              </div>
              <IonButton fill="clear" onClick={() => setShowFulfillModal(false)}>
                <IonIcon slot="icon-only" icon={closeOutline} />
              </IonButton>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.4, margin: '0 0 16px' }}>
              Select <strong>Donated</strong> or <strong>No Show</strong> for each willing donor. You must mark at least <strong>{request.units_needed}</strong> donor(s) as Donated before fulfilling.
            </p>

            {willingDonors.length > 0 ? (
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {willingDonors.map((donor) => {
                  const currentOutcome = donorOutcomes[donor.donor_id] ?? 'donated';

                  return (
                    <div
                      key={donor.donor_id}
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        padding: '14px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1B2430' }}>
                            {donor.name} <span style={{ color: '#B3122B', fontWeight: 700 }}>({donor.blood_type ?? '—'})</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '2px' }}>
                            Contact: {donor.phone_number ?? 'No contact'}
                          </div>
                        </div>
                        <span style={{ background: '#E8F5EE', color: '#1E7A4C', fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '999px' }}>
                          Willing
                        </span>
                      </div>

                      {/* Improved UI/UX Toggle Buttons for Donated / No Show */}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleOutcomeChange(donor.donor_id, 'donated')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: currentOutcome === 'donated' ? '2px solid #1E7A4C' : '1px solid #d1d5db',
                            background: currentOutcome === 'donated' ? '#E8F5EE' : '#f9fafb',
                            color: currentOutcome === 'donated' ? '#1E7A4C' : '#374151',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '16px' }} />
                          Donated
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOutcomeChange(donor.donor_id, 'no_show')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: currentOutcome === 'no_show' ? '2px solid #B3122B' : '1px solid #d1d5db',
                            background: currentOutcome === 'no_show' ? '#FCEEEE' : '#f9fafb',
                            color: currentOutcome === 'no_show' ? '#B3122B' : '#374151',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <IonIcon icon={closeCircleOutline} style={{ fontSize: '16px' }} />
                          No Show
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ background: '#FBF0DD', border: '1px solid #E0A63E', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <IonIcon icon={warningOutline} style={{ fontSize: '2rem', color: '#8A5B12', marginBottom: '6px' }} />
                <p style={{ color: '#8A5B12', fontSize: '0.88rem', fontWeight: 600, margin: 0 }}>
                  No donors have accepted or arrived for this request yet. At least {request.units_needed} donor(s) must accept before fulfilling.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <IonButton
                expand="block"
                color="medium"
                style={{ flex: 1 }}
                onClick={() => setShowFulfillModal(false)}
              >
                Cancel
              </IonButton>
              {willingDonors.length > 0 && (
                <IonButton
                  expand="block"
                  className="submit-btn"
                  style={{ flex: 1, margin: 0 }}
                  disabled={isFulfilling}
                  onClick={handleConfirmFulfill}
                >
                  {isFulfilling ? <IonSpinner name="dots" /> : 'Confirm & Fulfill'}
                </IonButton>
              )}
            </div>
          </div>
        </IonModal>

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

export default RequestDetail;