declare module 'react-native-maps' {
  import * as React from 'react';
  import type { ViewProps } from 'react-native';

  export type LatLng = {
    latitude: number;
    longitude: number;
  };

  export type Region = LatLng & {
    latitudeDelta: number;
    longitudeDelta: number;
  };

  export type MapViewProps = ViewProps & {
    initialRegion?: Region;
    region?: Region;
    showsUserLocation?: boolean;
    followsUserLocation?: boolean;
    children?: React.ReactNode;
    [key: string]: unknown;
  };

  export type MarkerProps = ViewProps & {
    coordinate: LatLng;
    title?: string;
    description?: string;
    [key: string]: unknown;
  };

  export default class MapView extends React.Component<MapViewProps> {}
  export class Marker extends React.Component<MarkerProps> {}
}
