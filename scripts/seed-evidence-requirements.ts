import { storage } from "../server/storage";
import type { InsertEvidenceRequirement } from "../shared/schema";

const initialRequirements: InsertEvidenceRequirement[] = [
  // Inspire Stage (3 requirements)
  {
    stage: "inspire",
    orderIndex: 1,
    title: "School Assembly",
    description: "Host a school-wide assembly to introduce the Plastic Clever Schools program and raise awareness about plastic pollution",
  },
  {
    stage: "inspire",
    orderIndex: 2,
    title: "Litter Audit & Cleanup",
    description: "Conduct a litter audit around your school grounds and organize a cleanup activity. Document with photos",
  },
  {
    stage: "inspire",
    orderIndex: 3,
    title: "Recycling Infrastructure",
    description: "Set up or improve recycling bins around the school. Take photos showing the bins with clear signage",
  },
  
  // Investigate Stage (2 requirements)
  {
    stage: "investigate",
    orderIndex: 1,
    title: "Plastic Waste Audit",
    description: "Complete a detailed audit of plastic usage across your school. Record and analyze data about single-use plastics",
  },
  {
    stage: "investigate",
    orderIndex: 2,
    title: "Action Plan Development",
    description: "Create a comprehensive action plan outlining specific steps your school will take to reduce plastic waste",
  },
  
  // Act Stage (3 requirements)
  {
    stage: "act",
    orderIndex: 1,
    title: "Plastic-Free Initiative",
    description: "Implement a plastic-free week or month. Document changes made and student/staff participation",
  },
  {
    stage: "act",
    orderIndex: 2,
    title: "Student-Led Campaign",
    description: "Launch a student-led campaign to promote plastic reduction. Include posters, social media, or events",
  },
  {
    stage: "act",
    orderIndex: 3,
    title: "Community Engagement",
    description: "Engage with the wider community (parents, local businesses) to spread plastic reduction awareness",
  },
];

async function seedEvidenceRequirements() {
  try {
    console.log("Starting evidence requirements seed...\n");

    // Check if requirements already exist
    const existingRequirements = await storage.getEvidenceRequirements();
    
    if (existingRequirements.length > 0) {
      console.log(`✓ Evidence requirements already exist (${existingRequirements.length} found)`);
      console.log("  Skipping seed to prevent duplicates.");
      console.log("\nBreakdown by stage:");
      
      const inspireCount = existingRequirements.filter(r => r.stage === 'inspire').length;
      const investigateCount = existingRequirements.filter(r => r.stage === 'investigate').length;
      const actCount = existingRequirements.filter(r => r.stage === 'act').length;
      
      console.log(`  - Inspire: ${inspireCount}`);
      console.log(`  - Investigate: ${investigateCount}`);
      console.log(`  - Act: ${actCount}`);
      return;
    }

    // Create all requirements
    console.log("Creating evidence requirements...\n");
    
    for (const requirement of initialRequirements) {
      const created = await storage.createEvidenceRequirement(requirement);
      console.log(`✓ Created: [${requirement.stage.toUpperCase()}] ${requirement.title}`);
    }

    console.log("\n✓ Successfully seeded all evidence requirements!");
    console.log(`  Total created: ${initialRequirements.length}`);
    console.log(`  - Inspire: 3 requirements`);
    console.log(`  - Investigate: 2 requirements`);
    console.log(`  - Act: 3 requirements`);

  } catch (error) {
    console.error("❌ Error seeding evidence requirements:", error);
    process.exit(1);
  }

  process.exit(0);
}

seedEvidenceRequirements();
