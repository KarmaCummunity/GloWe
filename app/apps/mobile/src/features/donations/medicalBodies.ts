// FR-DONATE-011 — curated, app-wide directory of Israeli life-saving and medical bodies.
// Static config only: user-visible copy (name/description) lives in the i18n bundle under
// `medicalBodies.items.<id>` so the list stays localizable and free of inline strings.
import type { Ionicons } from '@expo/vector-icons';

export type MedicalSectionId = 'blood' | 'organs' | 'firstAid' | 'equipment' | 'support';

export interface MedicalBody {
  /** Stable id; doubles as the i18n key suffix (`medicalBodies.items.<id>`). */
  readonly id: string;
  /** Official website; always https, opened in the external browser. */
  readonly url: string;
}

export interface MedicalSection {
  readonly id: MedicalSectionId;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly bodies: readonly MedicalBody[];
}

/** Display order is the array order: the most life-critical actions come first. */
export const MEDICAL_SECTIONS: readonly MedicalSection[] = [
  {
    id: 'blood',
    icon: 'water-outline',
    bodies: [{ id: 'mdaBlood', url: 'https://www.mdais.org' }],
  },
  {
    id: 'organs',
    icon: 'heart-outline',
    bodies: [
      { id: 'adi', url: 'https://www.adi.org.il' },
      { id: 'ezerMizionMarrow', url: 'https://ezermizion.org' },
    ],
  },
  {
    id: 'firstAid',
    icon: 'medkit-outline',
    bodies: [
      { id: 'mdaFirstAid', url: 'https://www.mdais.org' },
      { id: 'unitedHatzalah', url: 'https://israelrescue.org' },
      { id: 'hatzalahIsrael', url: 'https://hatzalah.org.il' },
      { id: 'zaka', url: 'https://www.zaka.org.il' },
    ],
  },
  {
    id: 'equipment',
    icon: 'bandage-outline',
    bodies: [
      { id: 'yadSarah', url: 'https://yadsarah.org' },
      { id: 'ezerMizionSupport', url: 'https://ezermizion.org' },
    ],
  },
  {
    id: 'support',
    icon: 'people-outline',
    bodies: [
      { id: 'cancerAssociation', url: 'https://www.cancer.org.il' },
      { id: 'eran', url: 'https://www.eran.org.il' },
      { id: 'saveAChildsHeart', url: 'https://saveachildsheart.org' },
      { id: 'alyn', url: 'https://www.alyn.org' },
    ],
  },
];
