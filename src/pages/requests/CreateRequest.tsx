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
import { arrowBackOutline, informationCircleOutline, cameraOutline } from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError, lookupApi, LookupOption, myEmergencyRequestApi } from '../../services/api';
import './Requests.css';

const CreateRequest: React.FC = () => {
  const history = useHistory();
  const { token, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bloodTypes, setBloodTypes] = useState<LookupOption[]>([]);
  const [barangays, setBarangays] = useState<LookupOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isDonor = user?.role === 'donor';

  const [formData, setFormData] = useState({
    patientName: '',
    bloodTypeId: '',
    barangayId: '',
    hospital: '',
    units: '',
    contactPerson: '',
    contactPhone: ''
  });

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

    if (isDonor && !selectedFile) {
      setError('Hospital Blood Request Form photo is required for donor submissions.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append('patient_name', formData.patientName);
      data.append('blood_type_id', String(formData.bloodTypeId));
      data.append('barangay_id', String(formData.barangayId));
      data.append('hospital_venue', formData.hospital);
      data.append('units_needed', String(formData.units));
      data.append('contact_person', formData.contactPerson);
      data.append('contact_number', formData.contactPhone);

      if (selectedFile) {
        data.append('request_form_image', selectedFile);
      }

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
              <label className="form-label">Patient's full name</label>
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
              <label className="form-label">Blood type needed</label>
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
              <label className="form-label">Barangay</label>
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
              <label className="form-label">Hospital / venue</label>
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
              <label className="form-label">Units needed</label>
              <IonInput
                mode="md"
                type="number"
                fill="outline"
                placeholder="e.g. 3"
                value={formData.units}
                onIonInput={(e) => handleChange('units', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact person</label>
              <IonInput
                mode="md"
                fill="outline"
                placeholder="e.g. Ana Santos"
                value={formData.contactPerson}
                onIonInput={(e) => handleChange('contactPerson', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact number</label>
              <IonInput
                mode="md"
                type="tel"
                fill="outline"
                placeholder="e.g. 09170000000"
                value={formData.contactPhone}
                onIonInput={(e) => handleChange('contactPhone', e.detail.value!)}
                className="custom-form-input"
              />
            </div>

            {/* Hospital Request Form Photo Picker */}
            <div className="form-group">
              <label className="form-label">
                Hospital Request Form Photo {isDonor ? '(Required)' : '(Optional)'}
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
                      Upload Hospital Request Form
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#888' }}>PNG, JPG, JPEG up to 5MB</span>
                  </div>
                )}
              </div>
            </div>

            <div className="info-note">
              <IonIcon icon={informationCircleOutline} />
              <span>
                Your request and hospital form photo will be reviewed by RHU staff before dispatching alerts to donors.
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