import React from 'react';
import { PlatformLoginRole } from '../../services/auth.service';
import { SuperAdminLogin } from './SuperAdminLogin';
import { AdminLogin } from './AdminLogin';
import { PlatformPortalSelection } from './PlatformPortalSelection';

export const PlatformLogin: React.FC<{ loginRole?: PlatformLoginRole }> = ({ loginRole }) => {
  if (loginRole === 'PLATFORM_SUPER_ADMIN') {
    return <SuperAdminLogin />;
  }
  if (loginRole === 'PLATFORM_ADMIN') {
    return <AdminLogin />;
  }
  return <PlatformPortalSelection />;
};

export { SuperAdminLogin, AdminLogin, PlatformPortalSelection };
