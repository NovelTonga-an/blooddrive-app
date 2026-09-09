import React, { useState } from 'react';
import { IonRouterLink } from '@ionic/react';
import {
  IonContent,
  IonPage,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardContent,
  IonSpinner
} from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { eyeOutline, eyeOffOutline, personOutline, lockClosedOutline } from 'ionicons/icons';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import './Login.css';

const Login: React.FC = () => {
  const { login } = useAuth();
  const history = useHistory();

  const [showPassword, setShowPassword] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIdentifierError(null);
    setPasswordError(null);
    setIsSubmitting(true);

    try {
      await login({ login_identifier: loginIdentifier, password });
      history.replace('/app/home');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.errors?.login_identifier?.[0]) {
          setIdentifierError(err.errors.login_identifier[0]);
        }
        if (err.errors?.password?.[0]) {
          setPasswordError(err.errors.password[0]);
        }
      } else {
        setError('Unable to log in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonContent className="login-content" scrollY={false}>
        <div className="login-wrapper">
          <IonGrid fixed>
            <IonRow className="ion-justify-content-center">
              <IonCol size="12" sizeSm="9" sizeMd="7" sizeLg="5" sizeXl="4">
                <IonCard className="login-card">
                  <IonCardContent className="card-body">
                    
                    {/* Header Section */}
                    <div className="brand-header text-center">
                      <div className="brand-badge">
                        <span className="drop-icon">🩸</span>
                      </div>
                      <h1 className="brand-title">BloodDrive</h1>
                      <p className="brand-subtitle">MHO Cervantes Portal</p>
                    </div>

                    {/* Form Section */}
                    <form onSubmit={handleLogin} className="login-form">
                      {/* Login Identifier Input */}
                      <div className="input-container">
                        <label className="input-label">Email, Phone Number, or Full Name</label>
                        <IonInput
                          type="text"
                          fill="outline"
                          mode="md"
                          placeholder="Email, phone, or full name"
                          value={loginIdentifier}
                          onIonInput={(e) => setLoginIdentifier(e.detail.value!)}
                          className={`rounded-input ${identifierError ? 'ion-invalid ion-touched' : ''}`}
                        >
                          <IonIcon slot="start" icon={personOutline} className="input-icon" />
                        </IonInput>
                        {identifierError && (
                          <IonText color="danger">
                            <p style={{ fontSize: '0.78rem', marginTop: '4px', marginBottom: '0' }}>{identifierError}</p>
                          </IonText>
                        )}
                      </div>

                      {/* Password Input */}
                      <div className="input-container">
                        <div className="label-row">
                          <label className="input-label">Password</label>
                          <a
                            href="#forgot"
                            className="forgot-password-link"
                            onClick={(e) => {
                              e.preventDefault();
                              setIsForgotModalOpen(true);
                            }}
                          >
                            Forgot?
                          </a>
                        </div>
                        <IonInput
                          type={showPassword ? 'text' : 'password'}
                          fill="outline"
                          mode="md"
                          placeholder="Enter your password"
                          value={password}
                          onIonInput={(e) => setPassword(e.detail.value!)}
                          className={`rounded-input ${passwordError ? 'ion-invalid ion-touched' : ''}`}
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
                        {passwordError && (
                          <IonText color="danger">
                            <p style={{ fontSize: '0.78rem', marginTop: '4px', marginBottom: '0' }}>{passwordError}</p>
                          </IonText>
                        )}
                      </div>

                      {/* General Error Message */}
                      {error && !identifierError && !passwordError && (
                        <IonText color="danger">
                          <p style={{ fontSize: '0.85rem', marginTop: '4px', marginBottom: '12px' }}>{error}</p>
                        </IonText>
                      )}

                      {/* Submit Button */}
                      <IonButton
                        type="submit"
                        expand="block"
                        className="btn-login"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? <IonSpinner name="dots" /> : 'LOG IN'}
                      </IonButton>
                    </form>

                    {/* Footer Section */}
                    <div className="signup-footer text-center">
                      <IonText color="medium">New to BloodDrive? </IonText>
                      <IonRouterLink routerLink="/register" className="signup-link">
                        Create Account
                      </IonRouterLink>
                    </div>

                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>

        {/* Forgot Password SMS OTP Modal */}
        <ForgotPasswordModal
          isOpen={isForgotModalOpen}
          onClose={() => setIsForgotModalOpen(false)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;