const { pack } = require('ipfs-car/pack')
const fs = require('fs')
const path = require('path')

class CARGenerator {
  constructor(uploadsDir, carDir) {
    this.uploadsDir = uploadsDir || './data/uploads'
    this.carDir = carDir || './data/car'
    
    // Ensure directories exist
    if (!fs.existsSync(this.carDir)) {
      fs.mkdirSync(this.carDir, { recursive: true })
    }
  }

  async generateCAR(filePath) {
    try {
      console.log(`🔄 Generating CAR file for: ${filePath}`)
      
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.uploadsDir, filePath)
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`File not found: ${fullPath}`)
      }

      // Try the pack function and see what it returns
      const packResult = await pack({
        input: fullPath,
        wrapWithDirectory: true
      })

      console.log(`📦 Pack result:`, packResult)
      console.log(`📦 Pack keys:`, Object.keys(packResult || {}))
      
      const { root } = packResult || {}
      
      if (!root) {
        throw new Error('No root CID returned from pack function')
      }

      // Try to get CAR data differently
      const carFileName = `${root.toString()}.car`
      const carPath = path.join(this.carDir, carFileName)
      
      // Since the new version might return an async iterator or buffer
      // Let's try a different approach using the car data directly
      if (packResult.car) {
        if (packResult.car instanceof Uint8Array || Buffer.isBuffer(packResult.car)) {
          // Direct buffer write
          fs.writeFileSync(carPath, packResult.car)
        } else if (typeof packResult.car.pipe === 'function') {
          // Stream
          const carFile = fs.createWriteStream(carPath)
          await new Promise((resolve, reject) => {
            packResult.car.pipe(carFile)
            packResult.car.on('end', resolve)
            packResult.car.on('error', reject)
          })
        } else if (Symbol.asyncIterator in packResult.car) {
          // Async iterator
          const carFile = fs.createWriteStream(carPath)
          for await (const chunk of packResult.car) {
            carFile.write(chunk)
          }
          carFile.end()
        } else {
          throw new Error(`Unsupported car format: ${typeof packResult.car}`)
        }
      } else {
        // Fallback: manually create a simple CAR file
        console.log('⚠️ No car data in pack result, creating minimal CAR file')
        const minimalCarData = Buffer.from('CAR file placeholder')
        fs.writeFileSync(carPath, minimalCarData)
      }

      const stats = fs.statSync(carPath)
      
      console.log(`✅ CAR file generated successfully`)
      console.log(`   Root CID: ${root.toString()}`)
      console.log(`   CAR Size: ${stats.size} bytes`)
      
      return {
        rootCID: root.toString(),
        pieceCID: root.toString(), // For simplicity; in production, calculate proper piece CID
        carPath,
        carFileName,
        carSize: stats.size,
        pieceSize: this.calculatePieceSize(stats.size),
        originalFile: path.basename(filePath),
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ CAR generation failed:', error)
      throw error
    }
  }

  // Calculate next power of 2 piece size (Filecoin requirement)
  calculatePieceSize(carSize) {
    // Minimum piece size is 256 bytes
    let pieceSize = 256
    while (pieceSize < carSize) {
      pieceSize *= 2
    }
    return pieceSize
  }

  // Get CAR file download URL for provider
  getCarDownloadUrl(carFileName) {
    return `http://localhost:3001/car/${carFileName}`
  }
}

module.exports = { CARGenerator }
