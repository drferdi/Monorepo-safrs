#!/usr/bin/env node
// Architected and built by the one and only Drferdi.

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const GOOGLE_REVIEW_PAGE_URL =
  process.env.GOOGLE_REVIEW_PAGE_URL ??
  'https://www.google.com/search?q=puskesmas+balowerti&oq=puskesmas+ba&gs_lcrp=EgZjaHJvbWUqDggAEEUYJxg7GIAEGIoFMg4IABBFGCcYOxiABBiKBTIICAEQRRgnGDsyBggCEEUYOTINCAMQLhivARjHARiABDINCAQQLhivARjHARiABDINCAUQLhivARjHARiABDIHCAYQABiABDIGCAcQRRg90gEIMjg0OWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8#lrd=0x2e78573cbf91501f:0xd80210a4dfdeef47,1,,,,'

const apiKey = process.env.GOOGLE_MAPS_API_KEY
const placeQuery = process.env.GOOGLE_PLACE_QUERY ?? 'Puskesmas Balowerti Kediri'
const outputFile =
  process.env.GOOGLE_REVIEWS_OUTPUT ??
  path.resolve(process.cwd(), 'public', 'data', 'google-reviews.json')

if (!apiKey) {
  console.error('GOOGLE_MAPS_API_KEY belum diset.')
  console.error('Set env dulu, contoh: GOOGLE_MAPS_API_KEY=xxx npm run sync:reviews')
  process.exit(1)
}

const searchEndpoint = 'https://places.googleapis.com/v1/places:searchText'

const searchResponse = await fetch(searchEndpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.googleMapsUri',
  },
  body: JSON.stringify({
    textQuery: placeQuery,
    languageCode: 'id',
    regionCode: 'ID',
    maxResultCount: 1,
  }),
})

if (!searchResponse.ok) {
  const message = await searchResponse.text()
  console.error('Gagal search place:', message)
  process.exit(1)
}

const searchResult = await searchResponse.json()
const placeId = searchResult?.places?.[0]?.id

if (!placeId) {
  console.error(`Place ID tidak ditemukan untuk query: "${placeQuery}"`)
  process.exit(1)
}

const detailsEndpoint = `https://places.googleapis.com/v1/places/${placeId}?languageCode=id&regionCode=ID`
const detailsResponse = await fetch(detailsEndpoint, {
  headers: {
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'id,displayName,googleMapsUri,rating,userRatingCount,reviews',
  },
})

if (!detailsResponse.ok) {
  const message = await detailsResponse.text()
  console.error('Gagal mengambil detail place:', message)
  process.exit(1)
}

const details = await detailsResponse.json()
const normalizedReviews = (details.reviews ?? []).map(review => ({
  authorName: review.authorAttribution?.displayName ?? review.authorName ?? 'Pengunjung Google',
  rating: review.rating ?? null,
  relativeTimeDescription: review.relativePublishTimeDescription ?? null,
  text: review.text?.text ?? '',
  publishTime: review.publishTime ?? null,
  originalText: review.originalText?.text ?? null,
  authorAttribution: {
    displayName: review.authorAttribution?.displayName ?? null,
    uri: review.authorAttribution?.uri ?? null,
    photoUri: review.authorAttribution?.photoUri ?? null,
  },
}))

const payload = {
  updatedAt: new Date().toISOString(),
  place: {
    id: details.id ?? placeId,
    name: details.displayName?.text ?? 'Puskesmas Balowerti',
    rating: details.rating ?? null,
    userRatingCount: details.userRatingCount ?? null,
    googleMapsUri: details.googleMapsUri ?? GOOGLE_REVIEW_PAGE_URL,
    reviewPageUri: GOOGLE_REVIEW_PAGE_URL,
    writeReviewUri: `https://search.google.com/local/writereview?placeid=${details.id ?? placeId}`,
  },
  reviews: normalizedReviews,
}

await fs.mkdir(path.dirname(outputFile), { recursive: true })
await fs.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

console.log(`Berhasil sinkron ${normalizedReviews.length} review`)
console.log(`Output: ${outputFile}`)
