const express = require('express')
const app = express()
const morgan = require('morgan')
const eventRoutes = require('./routes/events')
const { MongoClient } = require('mongodb')
const cors = require('cors')

require('dotenv').config()
const uri = process.env.MONGODB_URI

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  w: 'majority'
})

const databaseName = 'backend-challenge'
const collectionName = 'events'

async function run () {
  try {
    await client.connect()
    await client.db(databaseName).command({ ping: 1 })
    console.log('You successfully connected to MongoDB! ')
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error)
    process.exit(1)
  }
}

run()

app.use((req, res, next) => {
  req.eventsCollection = client.db(databaseName).collection(collectionName)
  next()
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(morgan('dev'))

app.use('/api/v3/app', eventRoutes)

app.use((req, res, next) => {
  res.status(404).json('no such resource in the database')
})

app.use((error, req, res, next) => {
  res.status(error.status || 500)
  res.json({
    error: { message: error.message }
  })
})

module.exports = app
