export interface ServiceTypeConfig {
  id: string;
  label: string;
  icon: string;
  category: 'service' | 'contract' | 'quote';
  template: string;
}

export const SERVICE_TYPES: Record<string, ServiceTypeConfig> = {
  barman: {
    id: 'prestation_barman',
    label: 'Prestation de Barman',
    icon: '🍸',
    category: 'service',
    template: 'prestation_barman',
  },
  design: {
    id: 'prestation_design',
    label: 'Design Graphique',
    icon: '🎨',
    category: 'service',
    template: 'prestation_design',
  },
  dev: {
    id: 'prestation_dev',
    label: 'Développement Logiciel',
    icon: '💻',
    category: 'service',
    template: 'prestation_dev',
  },
  photo: {
    id: 'prestation_photo',
    label: 'Photographie',
    icon: '📸',
    category: 'service',
    template: 'prestation_photo',
  },
  video: {
    id: 'prestation_video',
    label: 'Vidéographie',
    icon: '🎥',
    category: 'service',
    template: 'prestation_video',
  },
  formation: {
    id: 'prestation_formation',
    label: 'Formation',
    icon: '📚',
    category: 'service',
    template: 'prestation_formation',
  },
  btp: {
    id: 'prestation_btp',
    label: 'BTP/Construction',
    icon: '🏗️',
    category: 'service',
    template: 'prestation_btp',
  },
};

export const getServiceType = (id: string): ServiceTypeConfig | undefined => {
  return Object.values(SERVICE_TYPES).find(s => s.id === id);
};

export const getAllServiceTypes = (): ServiceTypeConfig[] => {
  return Object.values(SERVICE_TYPES);
};
