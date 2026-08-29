/**
 * bpmn-moddle descriptor for the `lunatic:` extension vocabulary
 * (see docs/LUNATIC_EXTENSION.md). Registered with the bpmn-js Modeler in
 * the studio and with bpmn-moddle in the node tests, so `lunatic:*`
 * elements round-trip as first-class typed moddle objects.
 */
export default {
  name: 'Lunatic',
  prefix: 'lunatic',
  uri: 'https://lunatic.dev/schema/1.0',
  xml: { tagAlias: 'lowerCase' },
  types: [
    {
      name: 'Mock',
      superClass: ['Element'],
      properties: [{ name: 'body', isBody: true, type: 'String' }]
    },
    {
      name: 'Binding',
      superClass: ['Element'],
      properties: [
        { name: 'type', isAttr: true, type: 'String' },
        { name: 'properties', isMany: true, type: 'Property' }
      ]
    },
    {
      name: 'Property',
      superClass: ['Element'],
      properties: [
        { name: 'name', isAttr: true, type: 'String' },
        { name: 'value', isAttr: true, type: 'String' }
      ]
    },
    {
      name: 'Test',
      superClass: ['Element'],
      properties: [
        { name: 'name', isAttr: true, type: 'String' },
        { name: 'payload', isAttr: true, type: 'String' },
        { name: 'body', isBody: true, type: 'String' }
      ]
    },
    {
      name: 'Scenario',
      superClass: ['Element'],
      properties: [
        { name: 'name', isAttr: true, type: 'String' },
        { name: 'payload', isAttr: true, type: 'String' },
        { name: 'description', isAttr: true, type: 'String' }
      ]
    },
    {
      name: 'Collection',
      superClass: ['Element'],
      properties: [
        { name: 'expression', isAttr: true, type: 'String' },
        { name: 'elementVariable', isAttr: true, type: 'String' }
      ]
    },
    {
      name: 'Sample',
      superClass: ['Element'],
      properties: [
        { name: 'correlationKey', isAttr: true, type: 'String' },
        { name: 'body', isBody: true, type: 'String' }
      ]
    }
  ]
};
