export type MachiningRecord = {
  id: string;
  material: 'Steel' | 'Aluminum' | 'Titanium' | 'Cast Iron';
  tool: 'End Mill' | 'Drill Bit' | 'Lathe Tool' | 'Face Mill';
  cuttingSpeed: number; // in m/min
  feedRate: number; // in mm/rev
  surfaceFinish: number; // in Ra (μm)
  materialRemovalRate: number; // in cm³/min
  toolWear: number; // in mm
  timestamp: string; // ISO date string
};
