import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonToast,
  IonSpinner,
  RefresherEventDetail
} from '@ionic/react';
import { add, searchOutline, personOutline, callOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ApiError,
  emergencyRequestApi,
  EmergencyRequestItem,
  myEmergencyRequestApi,
  MyEmergencyRequestItem
} from '../../services/api';
import './Requests.css';

function statusPillLabel(status: MyEmergencyRequestItem['status']): { label: string; className: string } {
  switch (status) {
    case 'pending':
      return { label: 'Pending Review', className: 'pending' };
    case 'broadcasting':
      return { label: 'Verified · Live', className: 'live' };
    case 'fulfilled':
      return { label: 'Fulfilled', className: 'live' };
    case 'cancelled':
      return { label: 'Cancelled', className: 'pending' };
  }
}

const RequestsList: React.FC = () => {
  const history = useHistory();
  const { token } = useAuth();

  const [segment, setSegment] = useState<'active' | 'mine'>('active');

  const [activeRequests, setActiveRequests] = useState<EmergencyRequestItem[]>([]);
  const [myRequests, setMyRequests] = useState<MyEmergencyRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const loadRequests = useCallback(async () => {
    if (!token) return;

    try {
      const [activeRes, mineRes] = await Promise.all([
        emergencyRequestApi.list(token),
        myEmergencyRequestApi.list(token),
      ]);
      setActiveRequests(activeRes.requests);
      setMyRequests(mineRes.requests);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to load requests.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleRefresh(event: CustomEvent<RefresherEventDetail>) {
    await loadRequests();
    event.detail.complete();
  }

  async function respondToRequest(requestId: number, responseStatus: 'accepted' | 'declined') {
    if (!token) return;
    setRespondingId(requestId);

    try {
      await emergencyRequestApi.respond(token, requestId, responseStatus);
      setActiveRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, my_response_status: responseStatus } : req))
      );
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to record your response.');
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen className="requests-content">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="requests-wrapper">

          {/* Topbar */}
          <div className="topbar">
            <h1>Requests</h1>
            <div className="icon-btn">
              <IonIcon icon={searchOutline} />
            </div>
          </div>

          {/* Segmented Control Switch */}
          <IonSegment
            value={segment}
            onIonChange={(e) => setSegment(e.detail.value as 'active' | 'mine')}
            className="custom-segmented"
            mode="ios"
          >
            <IonSegmentButton value="active">
              <IonLabel>Active</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="mine">
              <IonLabel>My Requests</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <IonSpinner name="crescent" />
            </div>
          ) : segment === 'active' ? (
            <>
              {activeRequests.length === 0 && (
                <p className="status-meta" style={{ padding: '12px 4px' }}>No emergency requests right now.</p>
              )}

              {activeRequests.map((req) => (
                <div key={req.id} className="req-card moderate">
                  <div className="req-top">
                    <div>
                      {/* Patient Name Header */}
                      <h3 className="req-title" style={{ marginTop: '4px' }}>
                        Patient: {req.patient_name}
                      </h3>
                      <p className="req-meta">{req.hospital_venue} · {req.barangay_name ?? 'Cervantes'}</p>
                      <p className="req-meta">{req.units_needed} unit(s) needed</p>
                    </div>
                    <div className="req-type">{req.blood_type}</div>
                  </div>

                  {/* Contact Details Section */}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                    <p className="req-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '3px 0' }}>
                      <IonIcon icon={personOutline} style={{ fontSize: '0.9rem' }} /> Contact Person: <strong>{req.contact_person}</strong>
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
                        disabled={respondingId === req.id}
                        onClick={() => respondToRequest(req.id, 'declined')}
                      >
                        Not available
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={respondingId === req.id}
                        onClick={() => respondToRequest(req.id, 'accepted')}
                      >
                        I can help
                      </button>
                    </div>
                  ) : (
                    <p className="status-meta" style={{ marginTop: '10px', fontWeight: 700 }}>
                      {req.my_response_status === 'accepted' && 'You confirmed you can help'}
                      {req.my_response_status === 'declined' && 'You marked yourself unavailable'}
                      {req.my_response_status === 'arrived' && 'You arrived to donate — thank you!'}
                    </p>
                  )}
                </div>
              ))}
            </>
          ) : (
            /* My Requests List View */
            <div className="my-requests-view">
              {myRequests.length === 0 && (
                <p className="status-meta" style={{ padding: '12px 4px' }}>
                  You haven't submitted any emergency requests yet.
                </p>
              )}

              {myRequests.map((req) => {
                const pill = statusPillLabel(req.status);

                return (
                  <div
                    key={req.id}
                    className="status-card"
                    onClick={() => history.push(`/app/requests/detail/${req.id}`)}
                  >
                    <div className="status-top">
                      <span className={`status-pill ${pill.className}`}>{pill.label}</span>
                      <span className="req-type">{req.blood_type}</span>
                    </div>
                    <h3 className="status-title">{req.patient_name}</h3>
                    <p className="status-meta">{req.hospital_venue} · {req.units_needed} units needed</p>
                    <p className="status-meta">
                      {req.notified_count} notified · {req.sent_count} sent · {req.accepted_count} willing
                    </p>
                    <a className="status-link">View timeline & notified donors →</a>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Floating Action Button to Create Request */}
        <IonFab slot="fixed" vertical="bottom" horizontal="end" className="fab-container">
            <IonFabButton
                onClick={() => history.push('/app/requests/new')}
                className="custom-fab-icon-only"
                aria-label="Create emergency blood request">
                <IonIcon icon={add} />
            </IonFabButton>
        </IonFab>

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

export default RequestsList;