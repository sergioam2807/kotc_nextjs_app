/**
 * Datos geográficos de Chile — 16 regiones + 346 comunas
 * Fuente: División Política Administrativa oficial de Chile (SUBDERE)
 * Ordenadas por código romano regional de norte a sur.
 */

export interface Region {
  /** Nombre completo de la región */
  nombre: string;
  /** Nombre corto para mostrar en UI */
  nombreCorto: string;
  /** Código oficial (RM, I…XVI) */
  codigo: string;
  comunas: string[];
}

export const REGIONES_CHILE: Region[] = [
  {
    nombre: 'Región de Arica y Parinacota',
    nombreCorto: 'Arica y Parinacota',
    codigo: 'XV',
    comunas: ['Arica', 'Camarones', 'General Lagos', 'Putre'],
  },
  {
    nombre: 'Región de Tarapacá',
    nombreCorto: 'Tarapacá',
    codigo: 'I',
    comunas: ['Alto Hospicio', 'Camiña', 'Colchane', 'Huara', 'Iquique', 'Pica', 'Pozo Almonte'],
  },
  {
    nombre: 'Región de Antofagasta',
    nombreCorto: 'Antofagasta',
    codigo: 'II',
    comunas: [
      'Antofagasta', 'Calama', 'María Elena', 'Mejillones', 'Ollagüe',
      'San Pedro de Atacama', 'Sierra Gorda', 'Taltal', 'Tocopilla',
    ],
  },
  {
    nombre: 'Región de Atacama',
    nombreCorto: 'Atacama',
    codigo: 'III',
    comunas: [
      'Alto del Carmen', 'Caldera', 'Chañaral', 'Copiapó', 'Diego de Almagro',
      'Freirina', 'Huasco', 'Tierra Amarilla', 'Vallenar',
    ],
  },
  {
    nombre: 'Región de Coquimbo',
    nombreCorto: 'Coquimbo',
    codigo: 'IV',
    comunas: [
      'Andacollo', 'Canela', 'Combarbalá', 'Coquimbo', 'Illapel',
      'La Higuera', 'La Serena', 'Los Vilos', 'Monte Patria', 'Ovalle',
      'Paiguano', 'Punitaqui', 'Río Hurtado', 'Salamanca', 'Vicuña',
    ],
  },
  {
    nombre: 'Región de Valparaíso',
    nombreCorto: 'Valparaíso',
    codigo: 'V',
    comunas: [
      'Algarrobo', 'Cabildo', 'Calera', 'Calle Larga', 'Cartagena',
      'Casablanca', 'Catemu', 'Concón', 'El Quisco', 'El Tabo',
      'Hijuelas', 'Isla de Pascua', 'Juan Fernández', 'La Cruz', 'La Ligua',
      'Limache', 'Llaillay', 'Los Andes', 'Nogales', 'Olmué',
      'Panquehue', 'Papudo', 'Petorca', 'Puchuncaví', 'Putaendo',
      'Quillota', 'Quilpué', 'Quintero', 'Rinconada', 'San Antonio',
      'San Esteban', 'San Felipe', 'Santa María', 'Santo Domingo',
      'Valparaíso', 'Villa Alemana', 'Viña del Mar', 'Zapallar',
    ],
  },
  {
    nombre: 'Región Metropolitana de Santiago',
    nombreCorto: 'Metropolitana',
    codigo: 'RM',
    comunas: [
      'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia',
      'Colina', 'Conchalí', 'Curacaví', 'El Bosque', 'El Monte',
      'Estación Central', 'Huechuraba', 'Independencia', 'Isla de Maipo',
      'La Cisterna', 'La Florida', 'La Granja', 'La Pintana', 'La Reina',
      'Lampa', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado',
      'Macul', 'Maipú', 'María Pinto', 'Melipilla', 'Padre Hurtado',
      'Paine', 'Pedro Aguirre Cerda', 'Peñaflor', 'Peñalolén', 'Pirque',
      'Providencia', 'Pudahuel', 'Puente Alto', 'Quilicura', 'Quinta Normal',
      'Recoleta', 'Renca', 'San Bernardo', 'San Joaquín', 'San José de Maipo',
      'San Miguel', 'San Pedro', 'San Ramón', 'Santiago', 'Talagante',
      'Tiltil', 'Vitacura',
    ],
  },
  {
    nombre: "Región del Libertador General Bernardo O'Higgins",
    nombreCorto: "O'Higgins",
    codigo: 'VI',
    comunas: [
      'Chépica', 'Chimbarongo', 'Codegua', 'Coinco', 'Coltauco',
      'Doñihue', 'Graneros', 'La Estrella', 'Las Cabras', 'Litueche',
      'Lolol', 'Machalí', 'Malloa', 'Marchigüe', 'Mostazal',
      'Nancagua', 'Navidad', 'Olivar', 'Palmilla', 'Paredones',
      'Peralillo', 'Peumo', 'Pichidegua', 'Pichilemu', 'Placilla',
      'Pumanque', 'Quinta de Tilcoco', 'Rancagua', 'Rengo', 'Requínoa',
      'San Fernando', 'San Vicente de Tagua Tagua', 'Santa Cruz',
    ],
  },
  {
    nombre: 'Región del Maule',
    nombreCorto: 'Maule',
    codigo: 'VII',
    comunas: [
      'Cauquenes', 'Chanco', 'Colbún', 'Constitución', 'Curepto',
      'Curicó', 'Empedrado', 'Hualañé', 'Licantén', 'Linares',
      'Longaví', 'Maule', 'Molina', 'Parral', 'Pelarco',
      'Pelluhue', 'Pencahue', 'Rauco', 'Retiro', 'Río Claro',
      'Romeral', 'Sagrada Familia', 'San Clemente', 'San Javier', 'San Rafael',
      'Talca', 'Teno', 'Vichuquén', 'Villa Alegre', 'Yerbas Buenas',
    ],
  },
  {
    nombre: 'Región de Ñuble',
    nombreCorto: 'Ñuble',
    codigo: 'XVI',
    comunas: [
      'Bulnes', 'Chillán', 'Chillán Viejo', 'Cobquecura', 'Coelemu',
      'Coihueco', 'El Carmen', 'Ninhue', 'Ñiquén', 'Pemuco',
      'Pinto', 'Portezuelo', 'Quillón', 'Quirihue', 'Ránquil',
      'San Carlos', 'San Fabián', 'San Ignacio', 'San Nicolás', 'Trehuaco',
      'Yungay',
    ],
  },
  {
    nombre: 'Región del Biobío',
    nombreCorto: 'Biobío',
    codigo: 'VIII',
    comunas: [
      'Alto Biobío', 'Antuco', 'Arauco', 'Cabrero', 'Cañete',
      'Chiguayante', 'Concepción', 'Contulmo', 'Coronel', 'Curanilahue',
      'Florida', 'Hualpén', 'Hualqui', 'Laja', 'Lebu',
      'Los Álamos', 'Los Ángeles', 'Lota', 'Mulchén', 'Nacimiento',
      'Negrete', 'Penco', 'Quilaco', 'Quilleco', 'San Pedro de la Paz',
      'San Rosendo', 'Santa Bárbara', 'Talcahuano', 'Tirúa', 'Tomé',
      'Tucapel', 'Yumbel',
    ],
  },
  {
    nombre: 'Región de La Araucanía',
    nombreCorto: 'Araucanía',
    codigo: 'IX',
    comunas: [
      'Angol', 'Carahue', 'Cholchol', 'Collipulli', 'Cunco',
      'Curacautín', 'Curarrehue', 'Ercilla', 'Freire', 'Galvarino',
      'Gorbea', 'Lautaro', 'Loncoche', 'Lonquimay', 'Los Sauces',
      'Lumaco', 'Melipeuco', 'Nueva Imperial', 'Padre Las Casas', 'Perquenco',
      'Pitrufquén', 'Pucón', 'Purén', 'Renaico', 'Saavedra',
      'Temuco', 'Teodoro Schmidt', 'Toltén', 'Traiguén', 'Victoria',
      'Vilcún', 'Villarrica',
    ],
  },
  {
    nombre: 'Región de Los Ríos',
    nombreCorto: 'Los Ríos',
    codigo: 'XIV',
    comunas: [
      'Corral', 'Futrono', 'La Unión', 'Lago Ranco', 'Lanco',
      'Los Lagos', 'Máfil', 'Mariquina', 'Paillaco', 'Panguipulli',
      'Río Bueno', 'Valdivia',
    ],
  },
  {
    nombre: 'Región de Los Lagos',
    nombreCorto: 'Los Lagos',
    codigo: 'X',
    comunas: [
      'Ancud', 'Calbuco', 'Castro', 'Chaitén', 'Chonchi',
      'Cochamó', 'Curaco de Vélez', 'Dalcahue', 'Fresia', 'Frutillar',
      'Futaleufú', 'Hualaihué', 'Llanquihue', 'Los Muermos', 'Maullín',
      'Osorno', 'Palena', 'Puerto Montt', 'Puerto Octay', 'Puerto Varas',
      'Puqueldón', 'Purranque', 'Puyehue', 'Queilén', 'Quellón',
      'Quemchi', 'Quinchao', 'Río Negro', 'San Juan de la Costa', 'San Pablo',
    ],
  },
  {
    nombre: 'Región de Aysén del General Carlos Ibáñez del Campo',
    nombreCorto: 'Aysén',
    codigo: 'XI',
    comunas: [
      'Aysén', 'Chile Chico', 'Cisnes', 'Cochrane', 'Coyhaique',
      'Guaitecas', 'Lago Verde', "O'Higgins", 'Río Ibáñez', 'Tortel',
    ],
  },
  {
    nombre: 'Región de Magallanes y de la Antártica Chilena',
    nombreCorto: 'Magallanes',
    codigo: 'XII',
    comunas: [
      'Antártica', 'Cabo de Hornos', 'Laguna Blanca', 'Natales', 'Porvenir',
      'Primavera', 'Punta Arenas', 'Río Verde', 'San Gregorio', 'Timaukel',
      'Torres del Paine',
    ],
  },
];

/** Lista plana y ordenada de todas las comunas (útil para búsqueda rápida) */
export const TODAS_LAS_COMUNAS: string[] = REGIONES_CHILE
  .flatMap(r => r.comunas)
  .sort((a, b) => a.localeCompare(b, 'es'));

/** Map: nombre de región → comunas (para filtrado rápido) */
export const COMUNAS_POR_REGION: Record<string, string[]> = Object.fromEntries(
  REGIONES_CHILE.map(r => [r.nombreCorto, r.comunas])
);

/** Map: nombre de comuna → región corta (para lookup inverso) */
export const REGION_POR_COMUNA: Record<string, string> = Object.fromEntries(
  REGIONES_CHILE.flatMap(r => r.comunas.map(c => [c, r.nombreCorto]))
);
