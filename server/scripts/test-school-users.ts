import { storage } from '../storage';

async function testSchoolUsers() {
  const schoolId = 'e36dd9ee-b903-42eb-aab4-b50cda53a6ab';
  
  console.log('=== Testing getSchoolUsersWithDetails ===');
  console.log('School ID:', schoolId);
  console.log('');
  
  try {
    const teamMembers = await storage.getSchoolUsersWithDetails(schoolId);
    
    console.log('Number of team members found:', teamMembers.length);
    console.log('');
    
    teamMembers.forEach((member, index) => {
      console.log(`--- Team Member ${index + 1} ---`);
      console.log('SchoolUser data:', {
        userId: member.userId,
        schoolId: member.schoolId,
        role: member.role,
      });
      console.log('User data:', JSON.stringify(member.user, null, 2));
      console.log('');
    });
    
    console.log('=== Raw Full Data Structure ===');
    console.log(JSON.stringify(teamMembers, null, 2));
    
  } catch (error) {
    console.error('Error testing school users:', error);
  }
  
  process.exit(0);
}

testSchoolUsers();
