import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonSpinner,
  IonToast,
  IonButton
} from '@ionic/react';
import { arrowBackOutline, ellipsisHorizontal } from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError, myEmergencyRequestApi, MyEmergencyRequestDetail, NotifiedDonor } from '../../services/api';
import './Requests.css';

function responseStatusLabel(status: NotifiedDonor['response_status']): { label: string; className: string } {
  switch (status) {
    case 'accepted':
      return { label: 'Willing', className: 'willing' };
    case 'arrived':
      return { label: 'Donated', className: 'willing' };
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

  const loadRequest = useCallback(async () => {
    if (!token) return;

    try {
      const response = await myEmergencyRequestApi.show(token, Number(id));
      setRequest(response.request);
      setDonors(response.donors);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to load this request.');
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  async function handleMarkFulfilled() {
    if (!token || !request) return;
    setIsFulfilling(true);

    try {
      await myEmergencyRequestApi.fulfill(token, request.id);
      await loadRequest();
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to mark this request as fulfilled.');
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

  const willingCount = donors.filter((d) => d.response_status === 'accepted' || d.response_status === 'arrived').length;
  const declinedCount = donors.filter((d) => d.response_status === 'declined').length;

  return (
    <IonPage>
      <IonContent fullscreen className="requests-content">
        <div className="requests-wrapper">

          {/* Header */}
          <div className="topbar">
            <div className="icon-btn" onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </div>
            <h1>My request</h1>
            <div className="icon-btn">
              <IonIcon icon={ellipsisHorizontal} />
            </div>
          </div>

          {/* Hero Header */}
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

          {/* Timeline Status */}
          <h3 className="section-title">Status timeline</h3>
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
                    : `${request.accepted_count} of ${request.units_needed} units confirmed`}
                </p>
              </div>
            </div>
          </div>

          {request.status === 'broadcasting' && (
            <IonButton
              expand="block"
              className="submit-btn"
              disabled={isFulfilling}
              onClick={handleMarkFulfilled}
            >
              {isFulfilling ? <IonSpinner name="dots" /> : 'Mark as fulfilled'}
            </IonButton>
          )}

          {/* Notified Donors List */}
          <h3 className="section-title" style={{ marginTop: '18px' }}>Donors notified</h3>
          <div className="notified-summary">
            <div className="ns-card">
              <div className="ns-num">{donors.length}</div>
              <div className="ns-label">Notified</div>
            </div>
            <div className="ns-card">
              <div className="ns-num good">{willingCount}</div>
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

          <div className="donor-card-container">
            {donors.map((donor) => {
              const status = responseStatusLabel(donor.response_status);

              return (
                <div key={donor.donor_id} className="donor-row">
                  <div className="donor-avatar">
                    {donor.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                  </div>
                  <div className="donor-info">
                    <div className="donor-name">{donor.name}</div>
                    <div className="donor-meta">{donor.blood_type ?? '—'}</div>
                  </div>
                  <span className={`donor-status ${status.className}`}>{status.label}</span>
                </div>
              );
            })}
          </div>

        </div>

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
