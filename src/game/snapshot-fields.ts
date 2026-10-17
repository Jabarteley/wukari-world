/** Read only plain snapshot records and enumerable data fields; never invoke saved getters. */
export function plainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return !prototype || prototype === Object.prototype
}

export function dataField(value: Record<string, unknown>, key: string): TypedPropertyDescriptor<unknown> | null | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return !descriptor ? undefined : descriptor.enumerable && Object.hasOwn(descriptor, 'value') ? descriptor : null
}

export const ownValue = (value: Record<string, unknown>, key: string): unknown => dataField(value, key)?.value
