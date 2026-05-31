import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
    console.log("Seeding database...");

    // Clean up existing data to avoid unique constraint errors
    await prisma.paragraphEmotion.deleteMany({});
    await prisma.paragraphBlock.deleteMany({});
    await prisma.readingHistory.deleteMany({});
    await prisma.rating.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.chapter.deleteMany({});
    await prisma.novelGenre.deleteMany({});
    await prisma.novel.deleteMany({});
    await prisma.user.deleteMany({});

    // Hash password
    const password = await argon2.hash("Password123!", {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
    });

    // Create Admin
    const admin = await prisma.user.create({
        data: {
            username: "admin_user",
            email: "admin@novelsive.com",
            password,
            role: "ADMIN"
        }
    });

    // Create Author
    const author = await prisma.user.create({
        data: {
            username: "JaneAusten",
            email: "author@novelsive.com",
            password,
            role: "USER"
        }
    });

    // Create Reader
    const reader = await prisma.user.create({
        data: {
            username: "bookworm99",
            email: "reader@novelsive.com",
            password,
            role: "USER"
        }
    });

    // Create Novels
    const novel1 = await prisma.novel.create({
        data: {
            title: "Echoes of Eternity",
            synopsis: "A thrilling adventure across the stars where ancient secrets are uncovered. A young pilot discovers a derelict ship that holds the key to the universe's origin.",
            cover_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
            title_image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
            is_mature: false,
            is_active: true,
            view_count: 1250,
            author_id: author.id,
            genres: {
                create: [{ genre: "Sci-Fi" }, { genre: "Adventure" }]
            }
        }
    });

    const novel2 = await prisma.novel.create({
        data: {
            title: "Whispers in the Dark",
            synopsis: "A detective with a troubled past must solve a series of gruesome murders that mimic an ancient cult's rituals. The closer she gets to the truth, the darker it becomes.",
            cover_image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
            title_image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
            is_mature: true, // Test mature blur
            is_active: true,
            view_count: 3400,
            author_id: author.id,
            genres: {
                create: [{ genre: "Mystery" }, { genre: "Horror" }]
            }
        }
    });

    // Ratings
    await prisma.rating.create({
        data: { user_id: reader.id, novel_id: novel1.id, score: 5 }
    });
    await prisma.rating.create({
        data: { user_id: reader.id, novel_id: novel2.id, score: 4 }
    });

    // Create Chapters for Novel 1
    const chapter1 = await prisma.chapter.create({
        data: {
            novel_id: novel1.id,
            title: "The Discovery",
            content: "It was a cold night when the beacon first activated. Captain Rayner looked at the flickering console, his heart racing. He had never seen a signal like this before.",
            status: "PUBLISHED",
            order_index: 1
        }
    });

    const chapter2 = await prisma.chapter.create({
        data: {
            novel_id: novel1.id,
            title: "Into the Void",
            content: "The ship descended into the cloudy atmosphere. Turbulence rattled the hull, but Rayner held the controls steady. 'Brace for impact!' he yelled.",
            status: "PUBLISHED",
            order_index: 2
        }
    });

    // Create a pending review chapter for Admin to test
    await prisma.chapter.create({
        data: {
            novel_id: novel1.id,
            title: "The Ancient Artifact",
            content: "They found it resting on a pedestal. It hummed with a strange, dark energy.",
            status: "PENDING_REVIEW",
            order_index: 3
        }
    });

    // Create Immersive Paragraph Blocks for Chapter 1 with 300+ words
    const blocks = [
        { 
            text: "It was a cold night when the beacon first activated. Captain Rayner looked at the flickering console, his heart racing. He had never seen a signal like this before. The deep hum of the engine reverberated through the metallic floor panels, vibrating into the soles of his boots. He tapped the primary comms array, static hissing violently back at him. The silence of deep space was usually a comforting blanket, but tonight, it felt like a predator lying in wait. Every shadow in the cockpit seemed to stretch just a little too far, every ambient hum echoing with a frequency that set his teeth on edge. The beacon blinked a rhythmic crimson, casting long, bloody silhouettes against the viewport. He swallowed hard, the dryness in his throat a stark reminder of his isolation. He was lightyears from the nearest allied outpost, stranded in a sector that hadn't been mapped since the First Expansion. The stories of this region were not the kind told to cadets. They were whispered by scarred veterans in dimly lit cantinas—tales of ghost ships, temporal anomalies, and things that lurked in the dark matter waiting for a stray vessel. Rayner checked the chronometer. It had been precisely forty-seven minutes since the navigation computer glitched, pulling them out of hyperspace. His crew was still in cryo-sleep, their vitals steady but their minds blissfully unaware of the creeping dread that was slowly wrapping itself around their captain. He reached for the manual override, his fingers trembling ever so slightly. If the beacon was an automated distress call, standard protocol dictated he investigate. But the pattern was wrong. It wasn't standard Morse or binary. It was something older. Something that felt undeniably ancient and utterly malevolent. He closed his eyes, taking a deep breath, trying to steady his erratic heartbeat, but the fear had already taken root in his mind.", 
            emotion: "FEAR", 
            words: 320 
        },
        { 
            text: "Suddenly, a bright light filled the cockpit, blinding him momentarily. When his vision cleared, he saw a majestic, beautiful planet right in front of them! The sheer scale of the celestial body took his breath away. It was a vibrant tapestry of deep azures and lush emeralds, swirling with pristine white cloud formations that danced across the atmosphere. Rayner gasped, stepping closer to the viewport, pressing his hands against the cold glass. The planetary rings caught the light of a distant, brilliant blue star, refracting it into a million shimmering rainbows that cascaded across the inky void of space. It was the most glorious sight he had ever laid eyes upon. Laughter, sudden and involuntary, bubbled up from his chest. They had found it. The legendary Eden Prime, the mythical homeworld that historians claimed was lost to the ages. He practically danced to the main console to initiate the waking sequence for his crew. He couldn't wait to see their faces when they realized what they had stumbled upon. This discovery would change everything. The years of grueling expeditions, the countless failures, the ridicule from the scientific community—all of it washed away in an instant, replaced by an overwhelming, effervescent joy. He imagined the celebrations, the parades, the history books that would bear his name. The sheer euphoria of the moment was intoxicating, a golden warmth spreading through his entire body. He activated the intercom, his voice shaking with pure elation. 'Wake up, everyone! You need to see this! We did it! We actually did it!' The planet seemed to glow brighter in response, a welcoming beacon of hope and a promise of a new beginning.", 
            emotion: "JOY", 
            words: 300 
        },
        { 
            text: "But the joy was short-lived. He turned to his co-pilot, smiling. 'We finally found it,' he whispered softly. Then, the co-pilot's face morphed into a terrifying creature. The skin sloughed off in gray, necrotic sheets, revealing a pulpy, glistening musculature underneath. Black ichor oozed from where its eyes should have been, dripping onto the pristine command deck. A stench, foul and metallic like rotting copper and old blood, filled the confined space. Rayner staggered backward, his stomach lurching violently. The creature let out a guttural, wet clicking sound, its jaw unhinging to reveal rows of needle-like teeth coated in a viscous green slime. The absolute wrongness of the entity, the sheer biological impossibility of it, sent a wave of pure revulsion crashing over him. He gagged, bringing a hand to his mouth as the entity took a shambling step forward. It wasn't just the physical horror of the thing; it was the psychic weight it carried—a feeling of absolute contamination. The air itself felt greasy, polluted by its mere existence. Rayner's mind scrambled for logic, for reason, but all he could feel was a sickening disgust that made his skin crawl. It reached out a multi-jointed appendage, the talons scraping against the metal bulkhead. He couldn't look away, mesmerized by the sheer grotesque display. This wasn't Eden Prime. This was a nightmare wearing the skin of his closest friend. He scrambled for the sidearm at his hip, his fingers slipping on the cold metal as another wave of nausea hit him. He had to destroy it. He had to purge this sickness from his ship before it spread.", 
            emotion: "DISGUST", 
            words: 305 
        }
    ];

    for (let i = 0; i < blocks.length; i++) {
        const pb = await prisma.paragraphBlock.create({
            data: {
                chapter_id: chapter1.id,
                content: blocks[i].text,
                word_count: blocks[i].words,
                block_index: i
            }
        });
        await prisma.paragraphEmotion.create({
            data: {
                paragraph_block_id: pb.id,
                emotion_label: blocks[i].emotion as any,
                confidence_score: 0.95
            }
        });
    }

    // Add a comment to chapter 1
    await prisma.comment.create({
        data: {
            user_id: reader.id,
            chapter_id: chapter1.id,
            content: "Wow, what a thrilling start! The ambient sounds really added to the fear."
        }
    });

    console.log("Seeding finished.");
    console.log("-----------------------------------------");
    console.log("Test Accounts (Password: Password123!)");
    console.log("- Reader: reader@novelsive.com");
    console.log("- Author: author@novelsive.com");
    console.log("- Admin:  admin@novelsive.com");
    console.log("-----------------------------------------");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
