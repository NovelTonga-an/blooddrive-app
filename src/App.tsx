import React, { useEffect } from 'react';
import { Redirect, Route, RouteProps } from 'react-router-dom';
import { IonApp, IonRouterOutlet, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';

/* CSS imports */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/variables.css';

/* Context & Services */
import { AuthProvider, useAuth } from './context/AuthContext';
import { locationService } from './services/LocationService';
import Login from './pages/Login';
import Register from './pages/Register';
import MainTabs from './components/MainTabs';

setupIonicReact();

// Blocks access to donor-only routes until a token is present.
const PrivateRoute: React.FC<RouteProps> = ({ component: Component, ...rest }) => {
  const { token } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) =>
        token && Component ? <Component {...props} /> : <Redirect to="/login" />
      }
    />
  );
};

// Keeps already-logged-in donors out of the login/register screens.
const GuestRoute: React.FC<RouteProps> = ({ component: Component, ...rest }) => {
  const { token } = useAuth();

  return (
    <Route
      {...rest}
      render={(props) =>
        !token && Component ? <Component {...props} /> : <Redirect to="/app/home" />
      }
    />
  );
};

const AppRoutes: React.FC = () => {
  const { isLoading, token, user } = useAuth();

  // Start watching location when donor is authenticated; stop when logged out
  useEffect(() => {
    if (token && user?.role === 'donor') {
      locationService.startTracking(token);
    } else {
      locationService.stopTracking();
    }

    return () => {
      locationService.stopTracking();
    };
  }, [token, user]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <IonSpinner name="crescent" />
      </div>
    );
  }

  return (
    <IonRouterOutlet>
      <GuestRoute exact path="/login" component={Login} />
      <GuestRoute exact path="/register" component={Register} />
      <PrivateRoute path="/app" component={MainTabs} />
      <Route exact path="/" render={() => <Redirect to={token ? '/app/home' : '/login'} />} />
    </IonRouterOutlet>
  );
};

const App: React.FC = () => (
  <IonApp>
    <AuthProvider>
      <IonReactRouter>
        <AppRoutes />
      </IonReactRouter>
    </AuthProvider>
  </IonApp>
);

export default App;