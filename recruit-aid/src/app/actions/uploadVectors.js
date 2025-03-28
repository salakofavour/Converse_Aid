'use server'

import { uploadVectors } from '@/lib/info-upload'

export async function uploadJobVectors(jobDetails) {
  try {
    const result = await uploadVectors(jobDetails)
    return { success: true, result }
  } catch (error) {
    console.error('Error in uploadJobVectors:', error)
    return { success: false, error: error.message }
  }
} 