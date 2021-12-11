const XRay = require('aws-xray-sdk-core')
const eventBridge = XRay.captureAWSClient(require('@dazn/lambda-powertools-eventbridge-client'))
const chance = require('chance').Chance()
const Log = require('@dazn/lambda-powertools-logger')
const wrap = require('@dazn/lambda-powertools-pattern-basic')
const CorrelationIds = require('@dazn/lambda-powertools-correlation-ids')

const busName = process.env.bus_name

module.exports.handler = wrap(async (event, context) => {
  const restaurantName = JSON.parse(event.body).restaurantName

  const orderId = chance.guid()
  const userId = event.requestContext.authorizer.claims.sub
  CorrelationIds.set('userId', userId)
  CorrelationIds.set('orderId', orderId)
  CorrelationIds.set('restaurantName', restaurantName)
  Log.debug('placing order...')

  await eventBridge.putEvents({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'order_placed',
      Detail: JSON.stringify({
        orderId,
        restaurantName,
      }),
      EventBusName: busName
    }]
  }).promise()

  Log.debug(`published event into EventBridge`, {
    eventType: 'order_placed',
    busName
  })

  const response = {
    statusCode: 200,
    body: JSON.stringify({ orderId })
  }

  return response
})
