// Playable classes.
export const CLASSES = {
  guerrero: {
    name: 'Guerrero', icon: '⚔️', model: 'Knight', show: ['Knight_Cape', '1H_Sword', 'Round_Shield', 'Knight_Helmet'],
    hp: 120, dmg: 22, speed: 1.0, weapon: '1H_Sword', parts: ['Knight_Body', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_Helmet'],
    combo: ['attack', 'attack2', 'attack3'], atkT: 0.42, reach: 2.0, ts: 1.6,
    skill: 'Escudo', skillDesc: 'Mantén clic derecho para bloquear casi todo el daño.',
    desc: 'Caballero de armadura brillante. Espada rápida, escudo resistente y equilibrio total.',
    bars: { Vida: 0.7, Daño: 0.55, Alcance: 0.35, Velocidad: 0.6 },
  },
  mago: {
    name: 'Mago', icon: '🔮', model: 'Mage', show: ['Mage_Hat', 'Mage_Cape', '2H_Staff'],
    hp: 85, dmg: 26, speed: 1.05, weapon: '2H_Staff', parts: ['Mage_Body', 'Mage_ArmLeft', 'Mage_ArmRight', 'Mage_Hat'],
    combo: ['shoot'], atkT: 0.5, reach: 22, ts: 1.5,
    skill: 'Nova de escarcha', skillDesc: 'Clic derecho: explosión helada que daña y congela a todos a tu alrededor.',
    desc: 'Lanza orbes arcanos desde lejos. Frágil de cerca, letal a distancia.',
    bars: { Vida: 0.4, Daño: 0.7, Alcance: 1.0, Velocidad: 0.65 },
  },
  bestia: {
    name: 'Bestia', icon: '🐻', model: 'Barbarian', show: ['Barbarian_Hat', 'Barbarian_Cape', '2H_Axe'],
    hp: 155, dmg: 30, speed: 0.95, weapon: '2H_Axe', parts: ['Barbarian_Body', 'Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_Hat'],
    combo: ['h2a', 'h2b', 'h2c'], atkT: 0.62, reach: 2.6, ts: 1.35,
    skill: 'Furia', skillDesc: 'Clic derecho: entras en furia, más daño y velocidad durante 7 segundos.',
    desc: 'Bárbaro salvaje con piel de oso y hacha gigante. Golpes devastadores en área.',
    bars: { Vida: 1.0, Daño: 0.9, Alcance: 0.5, Velocidad: 0.5 },
  },
  explorador: {
    name: 'Explorador', icon: '🗡️', model: 'Rogue', show: ['Rogue_Cape', 'Knife', 'Knife_Offhand'],
    hp: 105, dmg: 21, speed: 1.12, weapon: 'Knife', parts: ['Rogue_Body', 'Rogue_ArmLeft', 'Rogue_ArmRight'],
    combo: ['attack', 'attack2', 'attack3'], atkT: 0.36, reach: 1.9, ts: 1.75,
    skill: 'Guardia', skillDesc: 'Mantén clic derecho para cubrirte del daño.',
    desc: 'Ágil y veloz: golpes rápidos y gran movilidad.',
    bars: { Vida: 0.55, Daño: 0.5, Alcance: 0.3, Velocidad: 0.85 },
  },
};
export const classStats = (id, level, shield) => ({
  maxHp: CLASSES[id].hp + (level - 1) * 20 + (shield ? 25 : 0),
  dmg: CLASSES[id].dmg + (level - 1) * 6,
});
