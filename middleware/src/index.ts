import 'dotenv/config'
import express from 'express'
import http from 'http'
import authRouter from './routes/auth'
import ordersRouter from './routes/orders'
import containersRouter from './routes/containers'
import esgRouter from './routes/esg'
import vendorApplicationsRouter from './routes/vendorApplications'
import carbonRouter from './routes/carbon'
import { setupWebSocket } from './ws/wsServer'

const app = express()
app.use(express.json())

app.use('/', authRouter)
app.use('/api', ordersRouter)
app.use('/api', containersRouter)
app.use('/api', esgRouter)
app.use('/api', vendorApplicationsRouter)
app.use('/api', carbonRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const server = http.createServer(app)
setupWebSocket(server)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Middleware running on port ${PORT}`))
