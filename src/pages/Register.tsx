import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonPage,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonRouterLink
} from '@ionic/react';
import {
  personOutline,
  mailOutline,
  callOutline,
  locationOutline,
  waterOutline,
  calendarOutline,
  maleFemaleOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError, lookupApi, LookupOption } from '../services/api';
import './Register.css';

const Register: React.FC = () => {
  const { register } = useAuth();
  const history = useHistory();

  const [showPassword, setShowPassword] = useState(false);
  const [bloodTypes, setBloodTypes] = useState<LookupOption[]>([]);
  const [barangays, setBarangays] = useState<LookupOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    barangayId: '',
    bloodTypeId: '',
    gender: '',
    birthdate: '',
    password: '',
    passwordConfirmation: ''
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
        setError('Unable to load blood types / barangays. Please check your connection.');
      }
    })();
  }, []);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        name: formData.fullName,
        email: formData.email,
        phone_number: formData.phone,
        password: formData.password,
        password_confirmation: formData.passwordConfirmation,
        blood_type_id: Number(formData.bloodTypeId),
        barangay_id: formData.barangayId ? Number(formData.barangayId) : null,
        birthdate: formData.birthdate,
        gender: formData.gender as 'male' | 'female' | 'other',
      });
      history.replace('/app/home');
    } catch (err) {
      if (err instanceof ApiError) {
        const firstFieldError = err.errors && Object.values(err.errors)[0]?.[0];
        setError(firstFieldError ?? err.message);
      } else {
        setError('Unable to register. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="register-content">
        <div className="register-wrapper">
          <IonGrid fixed>
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" sizeSm="10" sizeMd="8" sizeLg="6" sizeXl="5">
                <IonCard className="register-card">
                  <IonCardContent className="card-body">
                    
                    {/* Header Section */}
                    <div className="brand-header text-center">
                      <div className="brand-badge">
                        <span className="drop-icon">🩸</span>
                      </div>
                      <h1 className="brand-title">Create Account</h1>
                      <p className="brand-subtitle">Join the MHO Cervantes life-saving community</p>
                    </div>

                    {/* Registration Form */}
                    <form onSubmit={handleRegister} className="register-form">
                      
                      {/* Full Name */}
                      <div className="input-container">
                        <label className="input-label">Full Name</label>
                        <IonInput
                          type="text"
                          fill="outline"
                          mode="md"
                          placeholder="Juan Dela Cruz"
                          value={formData.fullName}
                          onIonInput={(e) => handleChange('fullName', e.detail.value!)}
                          className="rounded-input"
                        >
                          <IonIcon slot="start" icon={personOutline} className="input-icon" />
                        </IonInput>
                      </div>

                      {/* Email & Phone Row */}
                      <IonRow className="grid-row-reset">
                        <IonCol size="12" sizeSm="7" className="col-pad">
                          <div className="input-container">
                            <label className="input-label">Email</label>
                            <IonInput
                              type="email"
                              fill="outline"
                              mode="md"
                              placeholder="juan@example.com"
                              value={formData.email}
                              onIonInput={(e) => handleChange('email', e.detail.value!)}
                              className="rounded-input"
                            >
                              <IonIcon slot="start" icon={mailOutline} className="input-icon" />
                            </IonInput>
                          </div>
                        </IonCol>
                        <IonCol size="12" sizeSm="5" className="col-pad">
                          <div className="input-container">
                            <label className="input-label">Phone</label>
                            <IonInput
                              type="tel"
                              fill="outline"
                              mode="md"
                              placeholder="0912..."
                              value={formData.phone}
                              onIonInput={(e) => handleChange('phone', e.detail.value!)}
                              className="rounded-input"
                            >
                              <IonIcon slot="start" icon={callOutline} className="input-icon" />
                            </IonInput>
                          </div>
                        </IonCol>
                      </IonRow>

                      {/* Barangay */}
                      <div className="input-container">
                        <label className="input-label">Barangay</label>
                        <IonSelect
                          fill="outline"
                          mode="md"
                          placeholder="Select barangay"
                          value={formData.barangayId}
                          onIonChange={(e) => handleChange('barangayId', e.detail.value)}
                          className="rounded-input rounded-select"
                        >
                          <IonIcon slot="start" icon={locationOutline} className="input-icon" />
                          {barangays.map((barangay) => (
                            <IonSelectOption key={barangay.id} value={String(barangay.id)}>
                              {barangay.name}
                            </IonSelectOption>
                          ))}
                        </IonSelect>
                      </div>

                      {/* Blood Type, Sex & Birthdate Row */}
                      <IonRow className="grid-row-reset">
                        <IonCol size="12" sizeSm="4" className="col-pad">
                          <div className="input-container">
                            <label className="input-label">Blood Type</label>
                            <IonSelect
                              fill="outline"
                              mode="md"
                              placeholder="Select"
                              value={formData.bloodTypeId}
                              onIonChange={(e) => handleChange('bloodTypeId', e.detail.value)}
                              className="rounded-input rounded-select"
                            >
                              <IonIcon slot="start" icon={waterOutline} className="input-icon" />
                              {bloodTypes.map((bloodType) => (
                                <IonSelectOption key={bloodType.id} value={String(bloodType.id)}>
                                  {bloodType.name}
                                </IonSelectOption>
                              ))}
                            </IonSelect>
                          </div>
                        </IonCol>

                        <IonCol size="12" sizeSm="4" className="col-pad">
                          <div className="input-container">
                            <label className="input-label">Sex</label>
                            <IonSelect
                              fill="outline"
                              mode="md"
                              placeholder="Select"
                              value={formData.gender}
                              onIonChange={(e) => handleChange('gender', e.detail.value)}
                              className="rounded-input rounded-select"
                            >
                              <IonIcon slot="start" icon={maleFemaleOutline} className="input-icon" />
                              <IonSelectOption value="male">Male</IonSelectOption>
                              <IonSelectOption value="female">Female</IonSelectOption>
                              <IonSelectOption value="other">Other</IonSelectOption>
                            </IonSelect>
                          </div>
                        </IonCol>

                        <IonCol size="12" sizeSm="4" className="col-pad">
                          <div className="input-container">
                            <label className="input-label">Birthdate</label>
                            <IonInput
                              type="date"
                              fill="outline"
                              mode="md"
                              value={formData.birthdate}
                              onIonInput={(e) => handleChange('birthdate', e.detail.value!)}
                              className="rounded-input"
                            >
                              <IonIcon slot="start" icon={calendarOutline} className="input-icon" />
                            </IonInput>
                          </div>
                        </IonCol>
                      </IonRow>

                      {/* Password */}
                      <div className="input-container">
                        <label className="input-label">Password</label>
                        <IonInput
                          type={showPassword ? 'text' : 'password'}
                          fill="outline"
                          mode="md"
                          placeholder="Create a strong password"
                          value={formData.password}
                          onIonInput={(e) => handleChange('password', e.detail.value!)}
                          className="rounded-input"
                        >
                          <IonIcon slot="start" icon={lockClosedOutline} className="input-icon" />
                          <IonButton
                            fill="clear"
                            slot="end"
                            aria-label="Toggle password visibility"
                            onClick={() => setShowPassword(!showPassword)}
                            className="password-toggle-btn"
                          >
                            <IonIcon slot="icon-only" icon={showPassword ? eyeOffOutline : eyeOutline} />
                          </IonButton>
                        </IonInput>
                      </div>

                      {/* Confirm Password */}
                      <div className="input-container">
                        <label className="input-label">Confirm Password</label>
                        <IonInput
                          type={showPassword ? 'text' : 'password'}
                          fill="outline"
                          mode="md"
                          placeholder="Re-enter your password"
                          value={formData.passwordConfirmation}
                          onIonInput={(e) => handleChange('passwordConfirmation', e.detail.value!)}
                          className="rounded-input"
                        >
                          <IonIcon slot="start" icon={lockClosedOutline} className="input-icon" />
                        </IonInput>
                      </div>

                      {/* Error message */}
                      {error && (
                        <IonText color="danger">
                          <p style={{ fontSize: '0.85rem', marginTop: '4px', marginBottom: '12px' }}>{error}</p>
                        </IonText>
                      )}

                      {/* Submit Button */}
                      <IonButton
                        type="submit"
                        expand="block"
                        className="btn-register"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <IonSpinner name="dots" /> : 'REGISTER AS DONOR'}
                      </IonButton>
                    </form>

                    {/* Footer */}
                    <div className="login-footer text-center">
                      <IonText color="medium">Already have an account? </IonText>
                      <IonRouterLink routerLink="/login" className="login-link">
                        Login here
                      </IonRouterLink>
                    </div>

                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Register;