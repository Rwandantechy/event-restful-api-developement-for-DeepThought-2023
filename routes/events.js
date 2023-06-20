const express = require('express')
const router = express.Router()
const upload = require('../multiConfig')
const { ObjectId } = require('mongodb')

// ######################### POSTING A NEW EVENT ##########################/
router.post('/events', upload.single('image'), async (req, res, next) => {
  try {
    const eventData = req.body
    const file = req.file

    if (file) {
      eventData.image = file.path
    }

    if (eventData.attendees) {
      eventData.attendees = eventData.attendees
        .split(',')
        .map((attendee) => attendee.trim())
    }

    const result = await req.eventsCollection.insertOne(eventData)
    const insertedId = result.insertedId

    const createdEvent = await req.eventsCollection.findOne({
      _id: insertedId
    })

    if (!createdEvent) {
      res.status(500).json({
        message: 'Failed to create the event'
      })
    }

    const response = {
      message: 'Event created successfully',
      request: {
        type: 'GET',
        description: 'The created event details',
        url: `${req.protocol}://${req.get('host')}/api/v3/app/events?id=${
          createdEvent._id
        }`
      }
    }

    res.status(201).json(response)
  } catch (error) {
    console.error('Failed to create the event:', error)
    next(error)
  }
})
// ######### GETTING ONE EVENT OR GETTING SOME EVENTS BASED ON PAGINATION ##########/
const isGetById = (req) => {
  return req.query.id !== undefined
}

router.get('/events', async (req, res, next) => {
  if (isGetById(req)) {
    const eventId = req.query.id

    try {
      if (!eventId) {
        return res.status(400).json({ message: 'Invalid event ID' })
      }
      const event = await req.eventsCollection.findOne({
        _id: new ObjectId(eventId)
      })

      if (!event) {
        return res.status(404).json({ message: 'Event not found' })
      }

      res.status(200).json(event)
    } catch (error) {
      console.error('Failed to fetch the event:', error)
      res.status(500).json(error)
    }
  } else {
    const limit = parseInt(req.query.limit)
    const page = parseInt(req.query.page)

    try {
      const totalCount = await req.eventsCollection.countDocuments()
      const skip = (page - 1) * limit
      const events = await req.eventsCollection
        .find()
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()

      const response = {
        metadata: {
          count: events.length,
          totalCount,
          page,
          limit
        },
        events: events.map((event) => ({
          event,
          request: {
            type: 'GET',
            description: 'Get the event details through this URL',
            url: `${req.protocol}://${req.get('host')}/api/v3/app/events?id=${
              event._id
            }`
          }
        }))
      }
      const nextPage = page + 1
      const prevPage = page - 1

      if (nextPage <= Math.ceil(totalCount / limit)) {
        response.metadata.nextPage = nextPage
        response.metadata.nextPageUrl = `${req.protocol}://${req.get(
          'host'
        )}/api/v3/app/events?limit=${limit}&page=${nextPage}`
      }
      if (prevPage >= 1) {
        response.metadata.prevPage = prevPage
        response.metadata.prevPageUrl = `${req.protocol}://${req.get(
          'host'
        )}/api/v3/app/events?limit=${limit}&page=${prevPage}`
      }

      res.status(200).json(response)
    } catch (error) {
      console.error('Failed to fetch events:', error)
      next(error)
    }
  }
})

router.get('/events/:id', async (req, res, next) => {
  const eventId = req.params.id

  try {
    if (!eventId) {
      return res.status(400).json({ message: 'Invalid event ID' })
    }

    const event = await req.eventsCollection.findOne({
      _id: new ObjectId(eventId),
      strict: true
    })

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }
    res.status(200).json(event)
  } catch (error) {
    console.error('Failed to fetch the event:', error)
    next(error)
  }
})

// ######################## UPDATING AN EXISTING EVENT ###########################/

router.put('/events/:id', upload.single('image'), async (req, res, next) => {
  const eventId = req.params.id
  const updateOps = {}

  if (req.file) {
    updateOps.image = req.file.path
  }

  for (const key in req.body) {
    updateOps[key] = req.body[key]
  }

  try {
    const result = await req.eventsCollection.updateOne(
      { _id: new ObjectId(eventId) },
      { $set: updateOps }
    )

    if (result.matchedCount === 0) {
      const error = new Error('Event not found')
      error.status = 404
      throw error
    }

    const updatedEvent = await req.eventsCollection.findOne({
      _id: new ObjectId(eventId)
    })

    const response = {
      message: 'Event updated successfully',
      event: updatedEvent,
      request: {
        type: 'GET',
        description: 'The event details',
        url: `${req.protocol}://${req.get('host')}/api/v3/app/events?id=/${
          updatedEvent._id
        }`
      }
    }

    res.status(200).json(response)
  } catch (error) {
    console.error('Failed to update the event:', error)
    res.status().json(error)
  }
})

// ##################### DELETING ONE EVENT FROM STORED EVENTS #############/
router.delete('/events/:id', async (req, res, next) => {
  const eventId = req.params.id
  try {
    const result = await req.eventsCollection.deleteOne({
      _id: new ObjectId(eventId)
    })

    if (result.deletedCount === 0) {
      const error = new Error('Event not found')
      res.status(404).json(error)
      throw error
    }

    const response = {
      message: 'Event deleted successfully',
      request: {
        type: 'POST',
        description: 'You can create a new event',
        url: `${req.protocol}://${req.get('host')}/api/v3/app/events`,
        body: {
          type: 'String',
          uid: 'String',
          name: 'String',
          tagline: 'String',
          schedule: 'String',
          description: 'String',
          image: 'File',
          moderator: 'String',
          category: 'String',
          sub_category: 'String',
          rigor_rank: 'Integer',
          attendees: 'Array of strings'
        }
      }
    }
    res.status(200).json(response)
  } catch (error) {
    console.error('Failed to delete the event:', error)
    next(error)
  }
})

module.exports = router
