import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonButton,
  IonSpinner,
  IonToast
} from '@ionic/react';
import {
  arrowBackOutline,
  locationOutline,
  timeOutline,
  peopleOutline,
  checkmarkCircle,
  closeCircle,
  informationCircleOutline,
  warningOutline
} from 'ionicons/icons';
import { useHistory, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { driveApi, Drive, ApiError } from '../../services/api';
import './Drives.css';

const DriveDetail: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();

  const [drive, setDrive] = useState<Drive | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deferralError, setDeferralError] = useState<string | null>(null);

  const fetchDrive = useCallback(async () => {
    if (!token) return;

    try {
      const response = await driveApi.list(token);
      const found = response.drives.find((d) => d.id === Number(id));
      setDrive(found ?? null);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to load this drive.');
    } finally {
      setIsLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    fetchDrive();
  }, [fetchDrive]);

  async function handleRespond(status: 'attending' | 'declined') {
    if (!token || !drive) return;

    setIsSubmitting(true);
    setDeferralError(null);

    try {
      await driveApi.respond(token, drive.id, status);
      setDrive((prev) => (prev ? { ...prev, my_response_status: status } : prev));
      setToastMessage(status === 'attending' ? 'You are confirmed for this drive!' : 'You marked yourself unavailable.');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setToastMessage(err.message);
        if (err.data?.is_deferred || err.status === 422) {
          setDeferralError(err.message);
        }
      } else {
        setToastMessage('Unable to update your status right now.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function to12h(t: string): string {
    const [h, m] = t.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${m} ${period}`;
  }

  // Check if drive date has passed
  const isPastDue = drive ? (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(drive.drive_date) < today;
  })() : false;

  const responseStatus = drive?.my_response_status;

  return (
    <IonPage>
      <IonContent fullscreen className="drives-content">
        <div className="drives-wrapper">

          {/* Header */}
          <div className="topbar">
            <div className="icon-btn" onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </div>
            <h1>Drive Details</h1>
            <div style={{ width: 38 }}></div>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <IonSpinner name="dots" />
            </div>
          ) : !drive ? (
            <p style={{ textAlign: 'center', color: '#6B7280', padding: '48px 0' }}>
              This drive could not be found.
            </p>
          ) : (
            <>
              {/* Hero Header Card */}
              <div className="drive-hero">
                <span className="hero-tag">MHO Cervantes Official Drive</span>
                <h2 className="hero-title">{drive.title}</h2>
                <p className="hero-sub">{drive.venue} · {formatDate(drive.drive_date)}</p>
              </div>

              {/* Info Card */}
              <div className="field-card">
                <div className="field-row">
                  <span className="field-label">
                    <IonIcon icon={timeOutline} className="row-icon" /> Schedule
                  </span>
                  <span className="field-value">{to12h(drive.start_time)} - {to12h(drive.end_time)}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">
                    <IonIcon icon={locationOutline} className="row-icon" /> Venue
                  </span>
                  <span className="field-value">{drive.venue}</span>
                </div>
                <div className="field-row">
                  <span className="field-label">
                    <IonIcon icon={peopleOutline} className="row-icon" /> Blood Units Needed
                  </span>
                  <span className="field-value">{drive.target_units} units</span>
                </div>
              </div>

              {/* Past Due Warning Banner or Actions */}
              {isPastDue ? (
                <div className="guidelines-card" style={{ borderLeft: '4px solid #8A5B12', backgroundColor: '#FBF0DD', padding: '16px', borderRadius: '12px', marginTop: '16px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                    <IonIcon icon={warningOutline} style={{ color: '#8A5B12', fontSize: '1.3rem' }} />
                    <h4 style={{ color: '#8A5B12', margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>This Donation Drive Has Ended</h4>
                  </div>
                  <p style={{ color: '#6B7280', margin: '4px 0 0', fontSize: '0.85rem' }}>
                    This event took place on {formatDate(drive.drive_date)} and is no longer active.
                  </p>
                </div>
              ) : (
                <>
                  {/* 90-Day Medical Deferral Notice Banner */}
                  {deferralError && (
                    <div className="guidelines-card" style={{ borderLeft: '4px solid #B3122B', backgroundColor: '#FCEEEE', padding: '14px', borderRadius: '12px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <IonIcon icon={warningOutline} style={{ color: '#7A0C1E', fontSize: '1.2rem' }} />
                        <h4 style={{ color: '#7A0C1E', margin: 0, fontSize: '0.92rem', fontWeight: 700 }}>90-Day Deferral Window Active</h4>
                      </div>
                      <p style={{ color: '#7A0C1E', margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{deferralError}</p>
                    </div>
                  )}

                  {drive.description && (
                    <div className="drives-section">
                      <h3 className="section-title">About This Drive</h3>
                      <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.5 }}>{drive.description}</p>
                    </div>
                  )}

                  {/* Pre-donation Reminders */}
                  <div className="drives-section">
                    <h3 className="section-title">Pre-Donation Guidelines</h3>
                    <div className="guidelines-card">
                      <div className="guide-item">
                        <IonIcon icon={checkmarkCircle} className="guide-icon" />
                        <span>Get at least 8 hours of sleep the night before.</span>
                      </div>
                      <div className="guide-item">
                        <IonIcon icon={checkmarkCircle} className="guide-icon" />
                        <span>Drink plenty of water before arriving at the venue.</span>
                      </div>
                      <div className="guide-item">
                        <IonIcon icon={checkmarkCircle} className="guide-icon" />
                        <span>Bring one valid ID for identity verification.</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons & Status */}
                  {responseStatus === 'attending' && (
                    <div className="registered-confirmation">
                      <div className="conf-icon-box">
                        <IonIcon icon={checkmarkCircle} />
                      </div>
                      <h4>You are attending this drive!</h4>
                      <p>We&apos;ll see you at {drive.venue} on {formatDate(drive.drive_date)}.</p>
                      <IonButton
                        fill="clear"
                        size="small"
                        color="medium"
                        disabled={isSubmitting || !!deferralError}
                        onClick={() => handleRespond('declined')}
                        style={{ marginTop: '8px' }}
                      >
                        Change to &quot;Can&apos;t Attend&quot;
                      </IonButton>
                    </div>
                  )}

                  {responseStatus === 'declined' && (
                    <div className="registered-confirmation declined-box">
                      <div className="conf-icon-box crimson">
                        <IonIcon icon={closeCircle} />
                      </div>
                      <h4>You marked yourself unavailable</h4>
                      <p>Thank you for letting us know.</p>
                      <IonButton
                        fill="clear"
                        size="small"
                        color="primary"
                        disabled={isSubmitting || !!deferralError}
                        onClick={() => handleRespond('attending')}
                        style={{ marginTop: '8px' }}
                      >
                        Change to &quot;I will attend&quot;
                      </IonButton>
                    </div>
                  )}

                  {(responseStatus === 'pending' || responseStatus === 'not_responded') && (
                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                      <IonButton
                        expand="block"
                        fill="outline"
                        color="medium"
                        disabled={isSubmitting || !!deferralError}
                        onClick={() => handleRespond('declined')}
                        style={{ flex: 1 }}
                      >
                        CAN&apos;T ATTEND
                      </IonButton>
                      <IonButton
                        expand="block"
                        className="submit-btn"
                        disabled={isSubmitting || !!deferralError}
                        onClick={() => handleRespond('attending')}
                        style={{ flex: 1, margin: 0 }}
                      >
                        {isSubmitting ? <IonSpinner name="dots" /> : 'CONFIRM ATTENDANCE'}
                      </IonButton>
                    </div>
                  )}
                </>
              )}

              <div className="info-note">
                <IonIcon icon={informationCircleOutline} />
                <span>
                  Organized in coordination with Municipal Health Office Cervantes and Rural Health Unit staff.
                </span>
              </div>
            </>
          )}

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

export default DriveDetail;