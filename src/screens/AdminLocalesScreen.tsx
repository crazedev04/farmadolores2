import React, { useCallback } from 'react';
import AdminEntityCrudScreen from '../components/admin/AdminEntityCrudScreen';
import { localCrudSchema } from '../admin/validators';

type LocalItem = {
  id: string;
  name: string;
  descrip: string;
  image: string;
  direccion: string;
  tel: string;
  url: string;
  gallery?: string[];
};

const initialForm = {
  name: '',
  descrip: '',
  image: '',
  direccion: '',
  tel: '',
  url: '',
  gallery: '',
};

const AdminLocalesScreen: React.FC = () => {
  const mapDoc = useCallback((id: string, data: Record<string, unknown>): LocalItem => {
    const telRaw = data.tel;
    const tel = Array.isArray(telRaw) ? telRaw.join(' / ') : String(telRaw || '');
    const galleryRaw = data.gallery;
    const gallery = Array.isArray(galleryRaw)
      ? galleryRaw.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      : [];

    return {
      id,
      name: String(data.name || ''),
      descrip: String(data.descrip || ''),
      image: String(data.image || ''),
      direccion: String(data.direccion || ''),
      tel,
      url: String(data.url || ''),
      gallery,
    };
  }, []);

  const mapItemToForm = useCallback(
    (item: LocalItem) => ({
      name: item.name || '',
      descrip: item.descrip || '',
      image: item.image || '',
      direccion: item.direccion || '',
      tel: item.tel || '',
      url: item.url || '',
      gallery: (item.gallery || []).join('\n'),
    }),
    [],
  );

  return (
    <AdminEntityCrudScreen<LocalItem>
      screenTitle="Negocios y locales"
      singularLabel="negocio"
      searchPlaceholder="Buscar negocio o direccion"
      emptyText="No hay negocios cargados."
      collectionName="publi"
      targetType="local"
      orderByField="name"
      fields={[
        { key: 'name', placeholder: 'Nombre', autoCapitalize: 'words' },
        { key: 'descrip', placeholder: 'Descripcion', multiline: true },
        { key: 'direccion', placeholder: 'Direccion' },
        { key: 'tel', placeholder: 'Telefono', keyboardType: 'phone-pad' },
        { key: 'url', placeholder: 'Sitio web / link', autoCapitalize: 'none' },
      ]}
      initialForm={initialForm}
      imageFieldKey="image"
      galleryFieldKey="gallery"
      imageUploadPath="locales/main"
      galleryUploadPath="locales/gallery"
      mapDoc={mapDoc}
      mapItemToForm={mapItemToForm}
      validate={(form) => {
        const parsed = localCrudSchema.safeParse(form);
        return parsed.success ? null : parsed.error.issues[0]?.message || 'Formulario invalido.';
      }}
      buildPayload={({ form, editing, deleteFieldValue }) => {
        const galleryList = (form.gallery || '')
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean);

        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          descrip: form.descrip.trim(),
          image: form.image.trim(),
          direccion: form.direccion.trim(),
          tel: form.tel.trim(),
          url: form.url.trim(),
        };

        if (galleryList.length > 0) {
          payload.gallery = galleryList;
        } else if (editing) {
          payload.gallery = deleteFieldValue;
        }

        return payload;
      }}
      getItemTitle={(item) => item.name || 'Sin nombre'}
      getItemSubtitle={(item) => [item.direccion, item.tel].filter(Boolean).join(' · ')}
      searchKeys={['name', 'descrip', 'direccion']}
      summaryFieldKey="name"
    />
  );
};

export default AdminLocalesScreen;
