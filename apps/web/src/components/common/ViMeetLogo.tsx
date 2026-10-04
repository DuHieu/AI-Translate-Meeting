import React from 'react';
import { LayaMeetLogo } from './LayaMeetLogo';

export const ViMeetLogo: React.FC<React.ComponentProps<typeof LayaMeetLogo>> = (props) => {
  return <LayaMeetLogo {...props} />;
};
