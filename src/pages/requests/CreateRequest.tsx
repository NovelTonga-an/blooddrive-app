import React, { useEffect, useState, useRef } from 'react';
import {
  IonContent,
  IonPage,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonText,
  IonSpinner
} from '@ionic/react';
import { arrowBackOutline, informationCircleOutline, cameraOutline, navigateOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { lookupApi, LookupOption, myEmergencyRequestApi, ApiError } from '../../services/api';
import './Requests.css';

import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

const customMarkerIcon = L.icon({
  iconUrl: markerIconPng,
  shadowUrl: markerShadowPng,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const LocationPickerMarker: React.FC<{
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
}> = ({ position, setPosition }) => {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  return (
    <Marker
      position={position}
      draggable={true}
      icon={customMarkerIcon}
      eventHandlers={{
        dragend(e) {
          const marker = e.target;
          const pos = marker.getLatLng();
          setPosition([pos.lat, pos.lng]);
        },
      }}
    />
  );
};

const CreateRequest: React.FC = () => {
  const history = useHistory();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bloodTypes, setBloodTypes] = useState<LookupOption[]>([]);
  const [barangays, setBarangays] = useState<LookupOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [mapCenter, setMapCenter] = useState<[number, number]>([16.9850, 120.7350]);
  const [pinnedCoords, setPinnedCoords] = useState<[number, number]>([16.9850, 120.7350]);
  const [isLocating, setIsLocating] = useState(false);

  const [formData, setFormData] = useState({
    patientName: '',
    bloodTypeId: '',
    barangayId: '',
    hospital: '',
    units: '',
    contactPerson: '',
    contactPhone: ''
  });

  const getCurrentLocation = async () => {
    setIsLocating(true);
    setError(null);
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
      setMapCenter(coords);
      setPinnedCoords(coords);
    } catch {
      setError('Unable to fetch GPS. You can manually tap or drag the pin on the map below.');
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [bloodTypeOptions, barangayOptions] = await Promise.all([
          lookupApi.bloodTypes(),
          lookupApi.barangays(),
        ]);
        setBloodTypes(bloodTypeOptions);
        setBarangays(barangayOptions);
      } catch {
        setError('Unable to load blood types or barangays.');
      }
    })();

    getCurrentLocation();
  }, []);

  const handleChange = (key: string, val: any) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Client-side validations matching backend constraints
    if (!formData.patientName.trim()) {
      setError("Patient's full name is required.");
      return;
    }
    if (!formData.bloodTypeId) {
      setError('Please select a blood type.');
      return;
    }
    if (!formData.hospital.trim()) {
      setError('Hospital / venue name is required.');
      return;
    }

    const unitsNum = parseInt(formData.units, 10);
    if (isNaN(unitsNum) || unitsNum < 1 || unitsNum > 20) {
      setError('Units needed must be between 1 and 20.');
      return;
    }

    if (!formData.contactPerson.trim()) {
      setError('Contact person is required.');
      return;
    }
    if (formData.contactPerson.length > 50) {
      setError('Contact person name cannot exceed 50 characters.');
      return;
    }

    const phoneRegex = /^09\d{9}$/;
    if (!phoneRegex.test(formData.contactPhone)) {
      setError('Contact number must start with 09 and be exactly 11 digits (e.g. 09170000000).');
      return;
    }

    if (!selectedFile) {
      setError('Hospital Blood Request Form photo is required.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('patient_name', formData.patientName);
      data.append('blood_type_id', String(formData.bloodTypeId));
      
      if (formData.barangayId) {
        data.append('barangay_id', String(formData.barangayId));
      }

      data.append('hospital_venue', formData.hospital);
      data.append('units_needed', String(unitsNum));
      data.append('contact_person', formData.contactPerson);
      data.append('contact_number', formData.contactPhone);
      data.append('latitude', String(pinnedCoords[0]));
      data.append('longitude', String(pinnedCoords[1]));
      data.append('request_form_image', selectedFile);

      const response = await myEmergencyRequestApi.create(token, data);
      history.replace(`/app/requests/detail/${response.request_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const firstFieldError = err.errors && Object.values(err.errors)[0]?.[0];
        setError(firstFieldError ?? err.message);
      } else {
        setError('Unable to submit request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="requests-content">
        <div className="requests-wrapper">
          <div className="topbar">
            <div className="icon-btn" onClick={() => history.goBack()}>
              <IonIcon icon={arrowBackOutline} />
            </div>
            <h1>New request</h1>
            <div style={{ width: 32 }}></div>
          </div>

          <form onSubmit={handleSubmit} className="request-form">
            <div className="form-group">
              <label className="form-label">Patient's full name *</label>
              <IonInput
                mode="md"
                fill="outline"
                placeholder="e.g. Juan Santos"
                value={formData.patientName}
                onIonInput={(e) => handleChange('patientName', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Blood type needed *</label>
              <IonSelect
                mode="md"
                fill="outline"
                placeholder="Select blood type"
                value={formData.bloodTypeId}
                onIonChange={(e) => handleChange('bloodTypeId', e.detail.value)}
                className="custom-form-select"
              >
                {bloodTypes.map((bt) => (
                  <IonSelectOption key={bt.id} value={String(bt.id)}>{bt.name}</IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <div className="form-group">
              <label className="form-label">Barangay (Optional)</label>
              <IonSelect
                mode="md"
                fill="outline"
                placeholder="Select barangay"
                value={formData.barangayId}
                onIonChange={(e) => handleChange('barangayId', e.detail.value)}
                className="custom-form-select"
              >
                {barangays.map((bg) => (
                  <IonSelectOption key={bg.id} value={String(bg.id)}>{bg.name}</IonSelectOption>
                ))}
              </IonSelect>
            </div>

            <div className="form-group">
              <label className="form-label">Hospital / venue name *</label>
              <IonInput
                mode="md"
                fill="outline"
                placeholder="e.g. RHU Cervantes Main Hall"
                value={formData.hospital}
                onIonInput={(e) => handleChange('hospital', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Pin Extraction Location on Map *</label>
                <IonButton fill="clear" size="small" onClick={getCurrentLocation} disabled={isLocating}>
                  <IonIcon slot="icon-only" icon={navigateOutline} />
                </IonButton>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#666', margin: '0 0 8px' }}>
                Tap or drag the pin to pinpoint the exact hospital or extraction venue.
              </p>

              <div style={{ height: '220px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #ccc' }}>
                <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <LocationPickerMarker position={pinnedCoords} setPosition={setPinnedCoords} />
                </MapContainer>
              </div>

              <div style={{ marginTop: '6px', fontSize: '0.8rem', color: '#1E7A4C', fontWeight: 600 }}>
                Pinned: Lat {pinnedCoords[0].toFixed(5)}, Lng {pinnedCoords[1].toFixed(5)}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Units needed (1–20) *</label>
              <IonInput
                mode="md"
                type="number"
                min="1"
                max="20"
                fill="outline"
                placeholder="e.g. 3"
                value={formData.units}
                onIonInput={(e) => handleChange('units', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact person (max 50 chars) *</label>
              <IonInput
                mode="md"
                maxlength={50}
                fill="outline"
                placeholder="e.g. Ana Santos"
                value={formData.contactPerson}
                onIonInput={(e) => handleChange('contactPerson', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact number (e.g. 09170000000) *</label>
              <IonInput
                mode="md"
                type="tel"
                maxlength={11}
                fill="outline"
                placeholder="09XXXXXXXXX"
                value={formData.contactPhone}
                onIonInput={(e) => handleChange('contactPhone', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Hospital Request Form Photo (Required) *
              </label>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #ccc',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f9f9f9',
                  marginTop: '4px'
                }}
              >
                {previewUrl ? (
                  <div>
                    <img 
                      src={previewUrl} 
                      alt="Form Preview" 
                      style={{ maxHeight: '200px', borderRadius: '8px', marginBottom: '8px' }} 
                    />
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Tap to change photo</p>
                  </div>
                ) : (
                  <div>
                    <IonIcon icon={cameraOutline} style={{ fontSize: '36px', color: '#B3122B' }} />
                    <p style={{ margin: '6px 0 2px', fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>
                      Upload Hospital Request Form *
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>PNG, JPG, JPEG up to 5MB</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-note">
              <IonIcon icon={informationCircleOutline} />
              <span>
                Your request and pinned extraction location will be verified by RHU staff before dispatching alerts to nearby donors.
              </span>
            </div>

            {error && (
              <IonText color="danger">
                <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>{error}</p>
              </IonText>
            )}

            <IonButton type="submit" expand="block" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? <IonSpinner name="dots" /> : 'SUBMIT FOR REVIEW'}
            </IonButton>
          </form>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CreateRequest;