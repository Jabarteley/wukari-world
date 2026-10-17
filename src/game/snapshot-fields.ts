/** Read only plain snapshot records and enumerable data fields; never invoke saved getters. */
export function plainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function dataField(value: Record<string, unknown>, key: string): { value: unknown } | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor?.enumerable && Object.hasOwn(descriptor, 'value') ? { value: descriptor.value } : undefined
}

export const ownValue = (value: Record<string, unknown>, key: string): unknown => dataField(value, key)?.value
