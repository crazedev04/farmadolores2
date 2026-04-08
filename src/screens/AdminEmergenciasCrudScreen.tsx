import React, { useCallback } from 'react';
import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import AdminEntityCrudScreen from '../components/admin/AdminEntityCrudScreen';
import { emergenciaCrudSchema } from '../admin/validators';

type EmergenciaItem = {
  id: string;
  name: string;
  dir: string;
  tel: string;
  image: string;
  detail: string;
  gallery?: string[];
  gps?: FirebaseFirestoreTypes.GeoPoint;
};

const initialForm = {
  name: '',
  dir: '',
  tel: '',
  detail: '',
  image: '',
  gallery: '',
  lat: '',
  lng: '',
};

const AdminEmergenciasCrudScreen: React.FC = () => {
  const mapDoc = useCallback((id: string, data: Record<string, unknown>): EmergenciaItem => {
    const telRaw = data.tel;
    const tel = Array.isArray(telRaw) ? telRaw.join(' / ') : String(telRaw || '');
    const galleryRaw = data.gallery;
    const gallery = Array.isArray(galleryRaw)
      ? galleryRaw.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [];

    return {
      id,
      name: String(data.name || ''),
      dir: String(data.dir || ''),
      tel,
      image: String(data.image || ''),
      detail: String(data.detail || ''),
      gallery,
      gps: data.gps as FirebaseFirestoreTypes.GeoPoint | undefined,
    };
  }, []);

  const mapItemToForm = useCallback(
    (item: EmergenciaItem) => ({
      name: item.name || '',
      dir: item.dir || '',
      tel: item.tel || '',
      detail: item.detail || '',
      image: item.image || '',
      gallery: (item.gallery || []).join('\n'),
      lat: item.gps?.latitude != null ? String(item.gps.latitude) : '',
      lng: item.gps?.longitude != null ? String(item.gps.longitude) : '',
    }),
    [],
  );

  return (
    <AdminEntityCrudScreen<EmergenciaItem>
      screenTitle="Gestion de emergencias"
      singularLabel="emergencia"
      searchPlaceholder="Buscar emergencia"
      emptyText="No hay emergencias cargadas."
      collectionName="emergencias"
      targetType="emergencia"
      orderByField="name"
      fields={[
        { key: 'name', placeholder: 'Nombre', autoCapitalize: 'words' },
        { key: 'dir', placeholder: 'Direccion' },
        { key: 'tel', placeholder: 'Telefono', keyboardType: 'phone-pad' },
        { key: 'detail', placeholder: 'Detalle (opcional)', multiline: true },
        { key: 'lat', placeholder: 'Latitud (opcional)', keyboardType: 'numeric' },
        { key: 'lng', placeholder: 'Longitud (opcional)', keyboardType: 'numeric' },
      ]}
      initialForm={initialForm}
      imageFieldKey="image"
      galleryFieldKey="gallery"
      imageUploadPath="emergencias/main"
      galleryUploadPath="emergencias/gallery"
      mapDoc={mapDoc}
      mapItemToForm={mapItemToForm}
      validate={(form) => {
        const parsed = emergenciaCrudSchema.safeParse(form);
        return parsed.success ? null : parsed.error.issues[0]?.message || 'Formulario invalido.';
      }}
      buildPayload={({ form, editing, GeoPointCtor, deleteFieldValue }) => {
        const galleryList = (form.gallery || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);

        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          dir: form.dir.trim(),
          tel: form.tel.trim(),
          image: form.image.trim(),
          detail: form.detail.trim(),
        };

        if (galleryList.length > 0) {
          payload.gallery = galleryList;
        } else if (editing) {
          payload.gallery = deleteFieldValue;
        }

        const lat = Number(form.lat);
        const lng = Number(form.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          payload.gps = new GeoPointCtor(lat, lng);
        }

        return payload;
      }}
      getItemTitle={(item) => item.name || 'Sin nombre'}
      getItemSubtitle={(item) => [item.dir, item.tel].filter(Boolean).join(' · ')}
      searchKeys={['name', 'dir', 'detail']}
      summaryFieldKey="name"
    />
  );
};

export default AdminEmergenciasCrudScreen;
