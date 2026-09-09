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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ForgotPasswordModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!phone) {
      setMessage('Please enter your registered phone number.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setIsError(false);
        setStep(2);
      } else {
        setMessage(data.message || 'No account found with this phone number.');
        setIsError(true);
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
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
      const res = await fetch('http://127.0.0.1:8000/api/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phone,
          otp: otp,
          password: password,
          password_confirmation: confirmPassword
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message);
        setIsError(false);
        setTimeout(() => {
          onClose();
          setStep(1);
          setPhone('');
          setOtp('');
          setPassword('');
          setConfirmPassword('');
        }, 2000);
      } else {
        setMessage(data.message || 'Invalid or expired OTP.');
        setIsError(true);
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="danger">
          <IonTitle>Reset Password</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>Close</IonButton>
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
            <p style={{ fontSize: '0.88rem', color: '#6B7280' }}>
              Enter your registered mobile phone number to receive a 6-digit SMS OTP code.
            </p>
            <IonInput
              type="tel"
              fill="outline"
              label="Registered Phone Number"
              labelPlacement="floating"
              placeholder="0917XXXXXXX"
              value={phone}
              onIonInput={(e) => setPhone(e.detail.value!)}
            />
            <IonButton expand="block" color="danger" className="ion-margin-top" onClick={handleSendOtp} disabled={isLoading}>
              {isLoading ? <IonSpinner name="dots" /> : 'Send SMS OTP'}
            </IonButton>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '0.88rem', color: '#6B7280' }}>
              Enter the 6-digit OTP sent to {phone} along with your new password.
            </p>
            <IonInput
              type="text"
              fill="outline"
              label="OTP Code"
              labelPlacement="floating"
              placeholder="000000"
              value={otp}
              onIonInput={(e) => setOtp(e.detail.value!)}
            />
            <IonInput
              type="password"
              fill="outline"
              label="New Password"
              labelPlacement="floating"
              className="ion-margin-top"
              value={password}
              onIonInput={(e) => setPassword(e.detail.value!)}
            />
            <IonInput
              type="password"
              fill="outline"
              label="Confirm New Password"
              labelPlacement="floating"
              className="ion-margin-top"
              value={confirmPassword}
              onIonInput={(e) => setConfirmPassword(e.detail.value!)}
            />
            <IonButton expand="block" color="danger" className="ion-margin-top" onClick={handleResetPassword} disabled={isLoading}>
              {isLoading ? <IonSpinner name="dots" /> : 'Reset Password'}
            </IonButton>
          </div>
        )}
      </IonContent>
    </IonModal>
  );
};