import { SvgXml } from 'react-native-svg';

import { ICONS, type IconName } from './icons';

// Icône du design Figma, à sa taille d'origine (largeur/hauteur racine conservées).
export function Icon({ name, color }: { name: IconName; color: string }) {
  const icon = ICONS[name];
  return (
    <SvgXml
      xml={icon.xml}
      width={icon.width}
      height={icon.height}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

// Icône de catégorie par code de domaine (catalogue KAN-52). Le réseau routier provincial
// n'a pas d'icône dédiée dans le design : il reprend celle de la voirie.
const DOMAIN_ICONS: Record<string, IconName> = {
  voirie: 'cat-voirie',
  routier_provincial: 'cat-voirie',
  eclairage: 'cat-eclairage',
  proprete: 'cat-proprete',
  securite: 'cat-securite',
  transport: 'cat-transport',
  electricite: 'cat-electricite',
};

export const domainIcon = (domain: string): IconName => DOMAIN_ICONS[domain] ?? 'cat-autre';
