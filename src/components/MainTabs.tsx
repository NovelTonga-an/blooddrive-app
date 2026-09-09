import React from 'react';
import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonRouterOutlet
} from '@ionic/react';
import { Redirect, Route } from 'react-router-dom';
import { home, alertCircleOutline, calendarOutline, person } from 'ionicons/icons';

import Dashboard from '../pages/Dashboard';
import Profile from '../pages/Profile';
import RequestsList from '../pages/requests/RequestsList';
import CreateRequest from '../pages/requests/CreateRequest';
import RequestDetail from '../pages/requests/RequestDetail';
import DrivesList from '../pages/drives/DrivesList';
import DriveDetail from '../pages/drives/DriveDetail';
import './MainTabs.css';

const MainTabs: React.FC = () => {
  return (
    <IonTabs>
      <IonRouterOutlet>
        <Route exact path="/app/home" component={Dashboard} />
        <Route exact path="/app/requests" component={RequestsList} />
        <Route exact path="/app/requests/new" component={CreateRequest} />
        <Route exact path="/app/requests/detail/:id" component={RequestDetail} />
        <Route exact path="/app/drives" component={DrivesList} />
        <Route exact path="/app/drives/detail/:id" component={DriveDetail} />
        <Route exact path="/app/profile" component={Profile} />
        <Route exact path="/app" render={() => <Redirect to="/app/home" />} />
      </IonRouterOutlet>

      <IonTabBar slot="bottom" className="custom-tab-bar">
        <IonTabButton tab="home" href="/app/home">
          <IonIcon icon={home} />
          <IonLabel>Home</IonLabel>
        </IonTabButton>

        <IonTabButton tab="requests" href="/app/requests">
          <IonIcon icon={alertCircleOutline} />
          <IonLabel>Requests</IonLabel>
        </IonTabButton>

        <IonTabButton tab="drives" href="/app/drives">
          <IonIcon icon={calendarOutline} />
          <IonLabel>Drives</IonLabel>
        </IonTabButton>
        
        <IonTabButton tab="profile" href="/app/profile">
          <IonIcon icon={person} />
          <IonLabel>Profile</IonLabel>
        </IonTabButton>
      </IonTabBar>
    </IonTabs>
  );
};

export default MainTabs;