import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
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
import { searchOutline, locationOutline, calendarOutline, checkmarkCircleOutline, closeCircleOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { driveApi, Drive, ApiError } from '../../services/api';
import './Drives.css';

const DrivesList: React.FC = () => {
  const history = useHistory();
  const { token } = useAuth();

  const [segment, setSegment] = useState<'upcoming' | 'registered'>('upcoming');
  const [activeChip, setActiveChip] = useState('all');

  const [drives, setDrives] = useState<Drive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const fetchDrives = useCallback(async () => {
    if (!token) return;

    try {
      const response = await driveApi.list(token);
      setDrives(response.drives);
    } catch (err) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to load donation drives.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDrives();
  }, [fetchDrives]);

  async function handleRefresh(event: CustomEvent<RefresherEventDetail>) {
    await fetchDrives();
    event.detail.complete();
  }

  async function handleRespond(e: React.MouseEvent, driveId: number, status: 'attending' | 'declined') {
    e.stopPropagation();

    if (!token) return;

    setRespondingId(driveId);

    try {
      await driveApi.respond(token, driveId, status);
      setDrives((prev) =>
        prev.map((d) => (d.id === driveId ? { ...d, my_response_status: status } : d))
      );
      setToastMessage(status === 'attending' ? "You're registered for this drive!" : "Response recorded.");
    } catch (err: any) {
      setToastMessage(err instanceof ApiError ? err.message : 'Unable to record response right now.');
    } finally {
      setRespondingId(null);
    }
  }

  // Filter out drives whose date has already passed
  function isUpcoming(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const driveDate = new Date(dateStr);
    return driveDate >= today;
  }

  function matchesChip(drive: Drive): boolean {
    if (!isUpcoming(drive.drive_date)) return false;

    if (activeChip === 'all') return true;
    if (activeChip === 'cervantes') return drive.venue.toLowerCase().includes('poblacion');
    if (activeChip === 'this-month') {
      const driveDate = new Date(drive.drive_date);
      const now = new Date();
      return driveDate.getFullYear() === now.getFullYear() && driveDate.getMonth() === now.getMonth();
    }
    return true;
  }

  const upcomingDrives = drives.filter((d) => matchesChip(d));
  const registeredDrives = drives.filter((d) => d.my_response_status === 'attending' && isUpcoming(d.drive_date));

  function formatDateParts(dateStr: string): { day: string; month: string } {
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString('en-US', { day: '2-digit' }),
      month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    };
  }

  function formatTimeRange(start: string, end: string): string {
    const to12h = (t: string) => {
      const [h, m] = t.split(':');
      const hour = parseInt(h, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 === 0 ? 12 : hour % 12;
      return `${hour12}:${m} ${period}`;
    };
    return `${to12h(start)} - ${to12h(end)}`;
  }

  return (
    <IonPage>
      <IonContent fullscreen className="drives-content">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        <div className="drives-wrapper">

          {/* Topbar */}
          <div className="topbar">
            <h1>Donation Drives</h1>
            <div className="icon-btn">
              <IonIcon icon={searchOutline} />
            </div>
          </div>

          {/* Segmented Control */}
          <IonSegment
            value={segment}
            onIonChange={(e) => setSegment(e.detail.value as 'upcoming' | 'registered')}
            className="custom-segmented"
            mode="ios"
          >
            <IonSegmentButton value="upcoming">
              <IonLabel>All Drives</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="registered">
              <IonLabel>My Registrations</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <IonSpinner name="dots" />
            </div>
          ) : segment === 'upcoming' ? (
            <>
              {/* Filter Chips */}
              <div className="chip-row">
                <button
                  type="button"
                  className={`chip ${activeChip === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveChip('all')}
                >
                  All Drives
                </button>
                <button
                  type="button"
                  className={`chip ${activeChip === 'cervantes' ? 'active' : ''}`}
                  onClick={() => setActiveChip('cervantes')}
                >
                  Poblacion
                </button>
                <button
                  type="button"
                  className={`chip ${activeChip === 'this-month' ? 'active' : ''}`}
                  onClick={() => setActiveChip('this-month')}
                >
                  This Month
                </button>
              </div>

              {upcomingDrives.length === 0 && (
                <p style={{ textAlign: 'center', color: '#6B7280', padding: '32px 0' }}>
                  No upcoming drives match this filter right now.
                </p>
              )}

              {upcomingDrives.map((drive) => {
                const { day, month } = formatDateParts(drive.drive_date);
                const status = drive.my_response_status;

                return (
                  <div
                    key={drive.id}
                    className="drive-card"
                    onClick={() => history.push(`/app/drives/detail/${drive.id}`)}
                  >
                    <div className="drive-card-header">
                      <div className="date-badge">
                        <span className="date-day">{day}</span>
                        <span className="date-month">{month}</span>
                      </div>
                      <div className="drive-header-info">
                        {status === 'attending' && (
                          <span className="drive-status-tag confirmed">
                            <IonIcon icon={checkmarkCircleOutline} /> Attending
                          </span>
                        )}
                        {status === 'declined' && (
                          <span className="drive-status-tag declined">
                            <IonIcon icon={closeCircleOutline} /> Declined
                          </span>
                        )}
                        {(status === 'pending' || status === 'not_responded') && (
                          <span className="drive-status-tag open">Open for Registration</span>
                        )}
                        <h3 className="drive-title">{drive.title}</h3>
                      </div>
                    </div>

                    <div className="drive-details">
                      <div className="detail-item">
                        <IonIcon icon={locationOutline} />
                        <span>{drive.venue}</span>
                      </div>
                      <div className="detail-item">
                        <IonIcon icon={calendarOutline} />
                        <span>{formatTimeRange(drive.start_time, drive.end_time)}</span>
                      </div>
                    </div>

                    <div className="drive-card-footer">
                      <span className="slots-left">Goal: {drive.target_units} units</span>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className={`btn ${status === 'declined' ? 'btn-ghost active' : 'btn-ghost'}`}
                          disabled={respondingId === drive.id}
                          onClick={(e) => handleRespond(e, drive.id, 'declined')}
                        >
                          Declined
                        </button>

                        <button
                          type="button"
                          className={`btn ${status === 'attending' ? 'btn-success' : 'btn-primary'}`}
                          disabled={respondingId === drive.id}
                          onClick={(e) => handleRespond(e, drive.id, 'attending')}
                        >
                          {respondingId === drive.id ? (
                            <IonSpinner name="dots" />
                          ) : status === 'attending' ? (
                            'Attending'
                          ) : (
                            'Confirm'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* Registered Drives View */
            <div className="registered-drives-view">
              {registeredDrives.length === 0 && (
                <p style={{ textAlign: 'center', color: '#6B7280', padding: '32px 0' }}>
                  You haven&apos;t confirmed attendance for any upcoming drives yet.
                </p>
              )}

              {registeredDrives.map((drive) => {
                const { day, month } = formatDateParts(drive.drive_date);

                return (
                  <div
                    key={drive.id}
                    className="drive-card registered-card"
                    onClick={() => history.push(`/app/drives/detail/${drive.id}`)}
                  >
                    <div className="drive-card-header">
                      <div className="date-badge registered-badge">
                        <span className="date-day">{day}</span>
                        <span className="date-month">{month}</span>
                      </div>
                      <div className="drive-header-info">
                        <span className="drive-status-tag confirmed">
                          <IonIcon icon={checkmarkCircleOutline} /> Attending
                        </span>
                        <h3 className="drive-title">{drive.title}</h3>
                      </div>
                    </div>

                    <div className="drive-details">
                      <div className="detail-item">
                        <IonIcon icon={locationOutline} />
                        <span>{drive.venue}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
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

export default DrivesList;