import { db } from '../server/db';
import { schools } from '../shared/schema';
import { isNull, or, eq } from 'drizzle-orm';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeSchool(schoolName: string, district: string | null, country: string): Promise<{ lat: string; lon: string } | null> {
  try {
    // Build query - prioritize country and school name, add district if available
    const query = district 
      ? `${schoolName}, ${district}, ${country}`
      : `${schoolName}, ${country}`;
    
    const encodedQuery = encodeURIComponent(query);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodedQuery}&format=json&limit=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PlasticCleverSchools/1.0 (school mapping project)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to geocode "${query}": HTTP ${response.status}`);
      return null;
    }

    const results: NominatimResult[] = await response.json();
    
    if (results.length === 0) {
      console.warn(`No results found for "${query}"`);
      return null;
    }

    return {
      lat: results[0].lat,
      lon: results[0].lon,
    };
  } catch (error) {
    console.error(`Error geocoding school:`, error);
    return null;
  }
}

async function main() {
  console.log('🌍 Starting school geocoding process...\n');

  // Fetch all schools that don't have coordinates
  const schoolsToGeocode = await db
    .select()
    .from(schools)
    .where(or(isNull(schools.latitude), isNull(schools.longitude)));

  console.log(`Found ${schoolsToGeocode.length} schools without coordinates\n`);

  if (schoolsToGeocode.length === 0) {
    console.log('✅ All schools already have coordinates!');
    return;
  }

  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < schoolsToGeocode.length; i++) {
    const school = schoolsToGeocode[i];
    
    // Progress indicator
    const progress = `[${i + 1}/${schoolsToGeocode.length}]`;
    console.log(`${progress} Geocoding: ${school.name}, ${school.country}`);

    // Get coordinates
    const coords = await geocodeSchool(
      school.name,
      school.legacyDistrict,
      school.country
    );

    if (coords) {
      // Update database
      await db
        .update(schools)
        .set({
          latitude: coords.lat,
          longitude: coords.lon,
          updatedAt: new Date(),
        })
        .where(eq(schools.id, school.id));

      successCount++;
      console.log(`  ✅ Success: (${coords.lat}, ${coords.lon})`);
    } else {
      failCount++;
      console.log(`  ❌ Failed to geocode`);
    }

    // Rate limiting: Wait 1 second between requests (Nominatim requirement)
    if (i < schoolsToGeocode.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Geocoding Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`Total processed: ${schoolsToGeocode.length}`);
  console.log('='.repeat(60));
}

// Run the script
main()
  .then(() => {
    console.log('\n✨ Geocoding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
