import React, { useState } from 'react';
import { 
  IonModal, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonContent, 
  IonInput, 
  IonText, 
  IonSpinner 
} from '@ionic/react';
import { sendForgotPasswordOtp, resetPasswordWithOtp, ApiError } from '../services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!name || !email || !phone) {
      setMessage('Please enter your name, email, and phone number to verify your account.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await sendForgotPasswordOtp({ name, email, phone_number: phone });
      setMessage(res.message);
      setIsError(false);
      setStep(2);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setMessage(err.message || 'Verification failed. Credentials do not match.');
      } else {
        setMessage('Network error. Please try again.');
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !password || !confirmPassword) {
      setMessage('Please fill in all fields.');
      setIsError(true);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('New passwords do not match.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await resetPasswordWithOtp({
        email: email,
        otp: otp,
        password: password,
        password_confirmation: confirmPassword
      });

      setMessage(res.message);
      setIsError(false);
      
      setTimeout(() => {
        handleModalClose();
      }, 2000);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setMessage(err.message || 'Invalid or expired OTP.');
      } else {
        setMessage('Network error. Please try again.');
      }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setStep(1);
    setName('');
    setEmail('');
    setPhone('');
    setOtp('');
    setPassword('');
    setConfirmPassword('');
    setMessage(null);
    setIsError(false);
    onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={handleModalClose} backdropDismiss={false}>
      <IonHeader>
        <IonToolbar color="danger">
          <IonTitle>Reset Password</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleModalClose} disabled={isLoading}>Close</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {message && (
          <IonText color={isError ? 'danger' : 'success'}>
            <p style={{ fontSize: '0.85rem', marginBottom: '12px', fontWeight: 600 }}>{message}</p>
          </IonText>
        )}

        {step === 1 ? (
          <div>
            <p style={{ fontSize: '0.88rem', color: '#6B7280', marginBottom: '16px' }}>
              Enter your exact registered name, email, and mobile number to receive a 6-digit Email OTP code.
            </p>
            <IonInput
              type="text"
              fill="outline"
              label="Full Name"
              labelPlacement="floating"
              placeholder="Juan Dela Cruz"
              value={name}
              onIonInput={(e) => setName(e.detail.value!)}
              className="ion-margin-bottom"
            />
            <IonInput
              type="email"
              fill="outline"
              label="Registered Email Address"
              labelPlacement="floating"
              placeholder="name@example.com"
              value={email}
              onIonInput={(e) => setEmail(e.detail.value!)}
              className="ion-margin-bottom"
            />
            <IonInput
              type="tel"
              fill="outline"
              label="Registered Phone Number"
              labelPlacement="floating"
              placeholder="0917XXXXXXX"
              value={phone}
              onIonInput={(e) => setPhone(e.detail.value!)}
              className="ion-margin-bottom"
            />
            <IonButton expand="block" color="danger" className="ion-margin-top" onClick={handleSendOtp} disabled={isLoading || !name || !email || !phone}>
              {isLoading ? <IonSpinner name="dots" /> : 'Verify & Send Email OTP'}
            </IonButton>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.88rem', color: '#6B7280', marginBottom: '16px' }}>
              Enter the 6-digit OTP sent to {email} along with your new password.
            </p>
            <IonInput
              type="text"
              fill="outline"
              label="OTP Code"
              labelPlacement="floating"
              placeholder="000000"
              maxlength={6}
              value={otp}
              onIonInput={(e) => setOtp(e.detail.value!)}
              className="ion-margin-bottom"
            />
            <IonInput
              type="password"
              fill="outline"
              label="New Password"
              labelPlacement="floating"
              placeholder="Min 8 characters"
              value={password}
              onIonInput={(e) => setPassword(e.detail.value!)}
              className="ion-margin-bottom"
            />
            <IonInput
              type="password"
              fill="outline"
              label="Confirm New Password"
              labelPlacement="floating"
              placeholder="Re-enter password"
              value={confirmPassword}
              onIonInput={(e) => setConfirmPassword(e.detail.value!)}
              className="ion-margin-bottom"
            />
            <IonButton expand="block" color="danger" className="ion-margin-top" onClick={handleResetPassword} disabled={isLoading || !otp || !password || !confirmPassword}>
              {isLoading ? <IonSpinner name="dots" /> : 'Reset Password'}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};