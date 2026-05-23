import { Setting } from '../models/Setting';

export async function getStartingCapital(): Promise<number> {
  try {
    const setting = await Setting.findOne({ key: 'starting_capital' });
    return setting ? Number(setting.value) : 15000;
  } catch {
    return 15000;
  }
}

export async function setStartingCapital(capital: number): Promise<void> {
  await Setting.findOneAndUpdate(
    { key: 'starting_capital' },
    { value: capital },
    { upsert: true, new: true }
  );
}
