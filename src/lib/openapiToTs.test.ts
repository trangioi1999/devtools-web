import { describe, it, expect } from 'vitest'
import { schemasToTypeScript } from './openapiToTs'

const calendarModel = {
  name: 'CalendarDayUpdateRequest',
  schema: {
    type: 'object',
    required: ['dayType'],
    properties: {
      dayType: { $ref: '#/components/schemas/CalendarDayType', description: 'Loại ngày: WORKING, HOLIDAY hoặc COMPENSATORY' },
      name: { type: 'string', description: 'Tên ngày (tối đa 100 ký tự)', maxLength: 100 },
    },
  },
}

describe('schemasToTypeScript', () => {
  it('renders export interface with I prefix, optional props, and JSDoc from description', () => {
    const ts = schemasToTypeScript([calendarModel], { suffix: 'BE' })
    expect(ts).toContain('export interface ICalendarDayUpdateRequestBE {')
    expect(ts).toContain('/** Loại ngày: WORKING, HOLIDAY hoặc COMPENSATORY */')
    expect(ts).toContain('dayType: ICalendarDayTypeBE;')
    expect(ts).toContain('name?: string;')
    expect(ts).toContain('Max length: 100')
  })

  it('renders enum schemas as literal-union type aliases', () => {
    const ts = schemasToTypeScript([
      { name: 'CalendarDayType', schema: { type: 'string', enum: ['WORKING', 'HOLIDAY', 'COMPENSATORY'] } },
    ])
    expect(ts).toContain("export type ICalendarDayType = 'WORKING' | 'HOLIDAY' | 'COMPENSATORY';")
  })

  it('maps arrays, integers, and $refs', () => {
    const ts = schemasToTypeScript([
      {
        name: 'LoanInfo',
        schema: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer' },
            tags: { type: 'array', items: { type: 'string' } },
            customer: { $ref: '#/components/schemas/Customer' },
          },
        },
      },
    ])
    expect(ts).toContain('id: number;')
    expect(ts).toContain('tags?: string[];')
    expect(ts).toContain('customer?: ICustomer;')
  })

  it('maps additionalProperties to Record', () => {
    const ts = schemasToTypeScript([
      { name: 'Meta', schema: { type: 'object', additionalProperties: { type: 'string' } } },
    ])
    expect(ts).toContain('export type IMeta = Record<string, string>;')
  })
})
