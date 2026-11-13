import { Contact, requestPermissionsAsync } from 'expo-contacts';

export type PickedContact = { name: string; phone: string | null };

/** Open the phone's contact list and return the chosen person's name and best phone number. */
export async function pickContact(): Promise<PickedContact | null> {
  const perm = await requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('Allow access to your contacts in your phone Settings to pick from them.');
  }
  const contact = await Contact.presentPicker();
  if (!contact) return null;
  const [name, phones] = await Promise.all([contact.getFullName(), contact.getPhones()]);
  const withNumber = phones.filter((p) => p.number);
  const mobile = withNumber.find((p) => /mobile|cell|iphone/i.test(p.label ?? '')) ?? withNumber[0];
  return { name: name?.trim() || 'Unnamed contact', phone: mobile?.number ?? null };
}
