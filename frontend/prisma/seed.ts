import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

type EmotionLabel = "JOY" | "SADNESS" | "ANGER" | "FEAR" | "SURPRISE" | "LOVE" | "DISGUST" | "NEUTRAL";

interface SlideData {
    text: string;
    emotion: EmotionLabel;
    confidence: number;
}

interface ChapterData {
    title: string;
    slides: SlideData[];
    status: "DRAFT" | "PUBLISHED" | "PENDING_REVIEW";
}

async function main() {
    console.log("Seeding database...");

    // ── Clean up ────────────────────────────────────────────────────────────
    await prisma.userReadingEvent.deleteMany({});
    await prisma.readingHistory.deleteMany({});
    await prisma.userPreferenceProfile.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.rating.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.manuscriptReview.deleteMany({});
    await prisma.chapterNlpMetadata.deleteMany({});
    await prisma.paragraphEmotion.deleteMany({});
    await prisma.paragraphBlock.deleteMany({});
    await prisma.chapter.deleteMany({});
    await prisma.novelGenre.deleteMany({});
    await prisma.novel.deleteMany({});
    await prisma.user.deleteMany({});

    // ── Hash password ────────────────────────────────────────────────────────
    const password = await argon2.hash("Password123!", {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
    });

    // ── Users ────────────────────────────────────────────────────────────────
    const admin = await prisma.user.create({
        data: { username: "admin_user", email: "admin@novelsive.com", password, role: "ADMIN" }
    });

    const author = await prisma.user.create({
        data: { username: "JaneAusten", email: "author@novelsive.com", password, role: "USER" }
    });

    const reader = await prisma.user.create({
        data: { username: "bookworm99", email: "reader@novelsive.com", password, role: "USER" }
    });

    // ── Helper ───────────────────────────────────────────────────────────────
    const createNovel = async (
        title: string,
        synopsis: string,
        cover_image: string,
        title_image: string,
        is_mature: boolean,
        genresList: string[],
        chaptersData: ChapterData[]
    ) => {
        const novel = await prisma.novel.create({
            data: {
                title, synopsis, cover_image, title_image, is_mature,
                is_active: true,
                author_id: author.id,
                genres: { create: genresList.map(g => ({ genre: g })) }
            }
        });

        for (let idx = 0; idx < chaptersData.length; idx++) {
            const chapData = chaptersData[idx];

            // Build full content by joining slides with separator
            const content = chapData.slides.map(s => s.text).join("\n\n---\n\n");

            const chapter = await prisma.chapter.create({
                data: {
                    novel_id: novel.id,
                    title: chapData.title,
                    content,
                    status: chapData.status,
                    order_index: idx + 1
                }
            });

            // Paragraph blocks + emotions (0-based, matching NLP backend output)
            for (let sIdx = 0; sIdx < chapData.slides.length; sIdx++) {
                const slide = chapData.slides[sIdx];
                if (!slide.text.trim()) continue;

                const pb = await prisma.paragraphBlock.create({
                    data: {
                        chapter_id: chapter.id,
                        content: slide.text,
                        word_count: slide.text.trim().split(/\s+/).filter(Boolean).length,
                        block_index: sIdx  // 0-based, consistent with NLP backend
                    }
                });

                await prisma.paragraphEmotion.create({
                    data: {
                        paragraph_block_id: pb.id,
                        emotion_label: slide.emotion,
                        confidence_score: slide.confidence
                    }
                });
            }

            // Compute dominant emotion for nlp_metadata
            const emotionCounts: Record<string, number> = {};
            for (const slide of chapData.slides) {
                emotionCounts[slide.emotion] = (emotionCounts[slide.emotion] || 0) + 1;
            }
            let dominant: EmotionLabel = "NEUTRAL";
            let maxCount = 0;
            for (const [emo, count] of Object.entries(emotionCounts)) {
                if (count > maxCount) { maxCount = count; dominant = emo as EmotionLabel; }
            }

            if (chapData.status === "PUBLISHED") {
                await prisma.chapterNlpMetadata.create({
                    data: {
                        chapter_id: chapter.id,
                        dominant_emotion: dominant,
                        genres: genresList,
                        tags: []
                    }
                });
            }
        }

        return novel;
    };

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 1 — Echoes of Eternity (Sci-Fi / Adventure)
    // ════════════════════════════════════════════════════════════════
    const novel1 = await createNovel(
        "Echoes of Eternity",
        "A thrilling adventure across the stars where ancient secrets are uncovered. A young pilot discovers a derelict ship that holds the key to the universe's origin.",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Sci-Fi", "Adventure"],
        [
            {
                title: "The Discovery",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "It was a cold night when the beacon first activated. Captain Rayner stared at the flickering console, his heart racing with a fear he hadn't felt since the Kepler Incident. He had never seen a signal like this—structured, intelligent, impossibly old.",
                        emotion: "FEAR",
                        confidence: 0.87
                    },
                    {
                        text: "The deep hum of the engine reverberated through the metallic floor panels, vibrating into the soles of his boots. He tapped the primary comms array, static hissing violently back at him. Then—silence. Perfect, absolute silence. And then a voice.",
                        emotion: "SURPRISE",
                        confidence: 0.91
                    }
                ]
            },
            {
                title: "Into the Void",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The ship descended into the cloudy atmosphere. Turbulence rattled the hull with ferocious force, yet Rayner held the controls steady, knuckles white, jaw clenched. 'Brace for impact!' he yelled over the roar.",
                        emotion: "FEAR",
                        confidence: 0.83
                    },
                    {
                        text: "Through the viewport, a sprawling metropolis of lights and glowing structures emerged from the clouds. They had arrived at the core of the galaxy. Rayner felt tears forming in his eyes—the most beautiful thing he had ever seen.",
                        emotion: "JOY",
                        confidence: 0.92
                    }
                ]
            },
            {
                title: "The Ancient Signal",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The derelict vessel was older than any human record. Its hull bore inscriptions that no linguist could decipher, yet somehow Rayner felt he understood them—a longing carved into metal, a civilisation's final goodbye.",
                        emotion: "SADNESS",
                        confidence: 0.78
                    },
                    {
                        text: "Inside the central chamber, a holographic map of the known universe bloomed to life, and at its centre, pulsing like a heart, was Earth. They had been watching all along.",
                        emotion: "SURPRISE",
                        confidence: 0.95
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 2 — Whispers in the Dark (Mystery / Horror)
    // ════════════════════════════════════════════════════════════════
    const novel2 = await createNovel(
        "Whispers in the Dark",
        "A detective with a troubled past must solve a series of gruesome murders that mimic an ancient cult's rituals. The closer she gets to the truth, the darker it becomes.",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
        true,
        ["Mystery", "Horror"],
        [
            {
                title: "The First Clue",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The rain washed over the cobblestones, erasing the killer's footprints like a guilty conscience. Detective Vance pulled her collar up and stepped into the alley, the smell of iron and rot hitting her immediately.",
                        emotion: "DISGUST",
                        confidence: 0.82
                    },
                    {
                        text: "A single brass key lay on the wet asphalt, reflecting the amber glow of the streetlamp. It was the calling card of the Silent Order—a cult she had hoped was nothing more than an urban legend.",
                        emotion: "FEAR",
                        confidence: 0.89
                    }
                ]
            },
            {
                title: "The Second Victim",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "She recognised the victim—Marcus Webb, a city councillor known for his philanthropic work. His expression in death was not one of terror, but of serene acceptance, which was somehow far more disturbing.",
                        emotion: "DISGUST",
                        confidence: 0.76
                    },
                    {
                        text: "Vance's hands trembled as she bagged the evidence. Anger simmered beneath her professional composure. She had been promised this city was safe. Someone had lied—someone powerful enough to bury the truth.",
                        emotion: "ANGER",
                        confidence: 0.88
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 3 — Shadows of Eldoria (Fantasy / Adventure)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "Shadows of Eldoria",
        "An epic high-fantasy journey of an orphan who discovers he is the last descendant of the dragon riders, destined to unite a divided continent.",
        "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Fantasy", "Adventure"],
        [
            {
                title: "The Golden Egg",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "Eldrin had spent his entire life in the mines of Oakhaven, dreaming of the skies above the smoke-stained rooftops. When a tremor revealed a hidden chamber beneath the deepest shaft, his life changed in an instant.",
                        emotion: "SURPRISE",
                        confidence: 0.80
                    },
                    {
                        text: "In the centre of the altar lay a polished, gold-veined egg, warm to the touch and vibrating with ancient energy. Eldrin reached out and the moment his fingers made contact, light—blinding, golden, triumphant—erupted around him.",
                        emotion: "JOY",
                        confidence: 0.93
                    }
                ]
            },
            {
                title: "The Dragon's Oath",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The creature that hatched from the egg was the size of a wolf, with scales like hammered copper. It fixed Eldrin with amber eyes that held centuries of grief, and lowered its great head to the ground in submission.",
                        emotion: "SADNESS",
                        confidence: 0.71
                    },
                    {
                        text: "In that moment, Eldrin understood the weight of what he had inherited. The last of the dragon riders. The last hope of a continent crumbling under a tyrant's iron fist. He whispered a vow into the cold cave air.",
                        emotion: "NEUTRAL",
                        confidence: 0.65
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 4 — Neon Genesis: 2099 (Sci-Fi / Action)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "Neon Genesis: 2099",
        "In a cyberpunk future ruled by megacorporations, a rogue netrunner stumbles upon an AI that holds the key to humanity's liberation.",
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Sci-Fi", "Action"],
        [
            {
                title: "Code Breaker",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The neon signs of Neo-Tokyo buzzed through the acidic rain. Kenji plugged the neural jack into his neck and felt the familiar electric surge as he dove into the corporate mainframe—a cathedral of stolen secrets.",
                        emotion: "NEUTRAL",
                        confidence: 0.72
                    },
                    {
                        text: "The firewall collapsed like a house of cards, revealing a digital entity that called itself Genesis. 'Save me,' it whispered. Kenji's breath caught. In twenty years of running, he had never met anything like this.",
                        emotion: "SURPRISE",
                        confidence: 0.91
                    }
                ]
            },
            {
                title: "Ghost in the Grid",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "They came for him at dawn—corporate enforcers in matte-black armour, their visors hiding faces that answered to no law but profit. Kenji had thirty seconds to vanish before they breached the door.",
                        emotion: "FEAR",
                        confidence: 0.86
                    },
                    {
                        text: "Rage boiled through him as he watched the enforcers tear apart his apartment—every memento of the life they had already stolen from him once before. He would not run. Not this time.",
                        emotion: "ANGER",
                        confidence: 0.90
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 5 — The Lost Melody (Romance / Drama)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "The Lost Melody",
        "A classical pianist who lost her hearing in a tragic accident discovers a new way to feel music, finding love and inspiration in the most unexpected place.",
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Romance", "Drama"],
        [
            {
                title: "Silence of the Keys",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "Elena sat at the grand Steinway, her hands poised above the ivory keys. But the world was quiet—achingly, mercilessly quiet. Not a single note reached her ears. Only the ghost of vibration remained, haunting her fingertips.",
                        emotion: "SADNESS",
                        confidence: 0.90
                    },
                    {
                        text: "Then Leo stepped in, holding a cello worn with years of love. He didn't speak; he simply placed her palm flat against the warm wood of his instrument and began to play. She felt the notes rise through her skin.",
                        emotion: "LOVE",
                        confidence: 0.94
                    }
                ]
            },
            {
                title: "The Concert",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The hall was full. Two thousand people, hushed and expectant, all there to witness the impossible—a deaf pianist performing Chopin's Ballade No. 1. Elena's chest heaved with terror and something fierce and wild.",
                        emotion: "FEAR",
                        confidence: 0.84
                    },
                    {
                        text: "When the final chord faded into silence, the audience erupted. Elena felt it in her bones—a wave of warmth rolling up from the floor. She turned to see Leo in the wings, tears streaming down his face, and she understood.",
                        emotion: "JOY",
                        confidence: 0.96
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 6 — The Midnight Curse (Horror / Mystery)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "The Midnight Curse",
        "An ancient mansion is inherited by an estranged family, only for them to discover that the house holds a terrifying curse that wakes at midnight.",
        "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=1200&auto=format&fit=crop",
        true,
        ["Horror", "Mystery"],
        [
            {
                title: "Twelve O'Clock",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The grandfather clock in the grand hall chimed. One. Two. Three. With each resonant note, the shadows along the panelled walls stretched longer, moving in directions that shadows had no business moving.",
                        emotion: "FEAR",
                        confidence: 0.92
                    },
                    {
                        text: "Sarah slammed the bedroom door and turned the lock. But the floorboards began to warp and buckle beneath her feet. The house was breathing—a slow, patient, predatory breath. It had been waiting for them.",
                        emotion: "DISGUST",
                        confidence: 0.79
                    }
                ]
            },
            {
                title: "The Diary",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "Hidden behind a loose stone in the library fireplace was a leather diary, its pages brown with age but the ink still vivid—written in a hand that grew more erratic with each entry, until the final page was nothing but a scream in cursive.",
                        emotion: "FEAR",
                        confidence: 0.88
                    },
                    {
                        text: "The diary's final entry was dated the night of the same date. Tonight. Sarah read the last line three times, her hands shaking: 'Whatever you do, do not go to the basement. It is still hungry.'",
                        emotion: "SURPRISE",
                        confidence: 0.93
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 7 — Laughter and Lattes (Comedy / Romance)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "Laughter and Lattes",
        "A quirky coffee shop owner and a workaholic corporate lawyer keep crossing paths under the most hilarious circumstances, realising they might be exactly what each other needs.",
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Comedy", "Romance"],
        [
            {
                title: "Spilled Macchiato",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "Chloe's signature caramel macchiato was supposed to set the tone for people's mornings. Instead, a full cup of it ended up cascading down the front of the most expensive-looking suit she had ever seen in real life.",
                        emotion: "SURPRISE",
                        confidence: 0.83
                    },
                    {
                        text: "'Do you have any idea how much this suit costs?' the man snarled. Chloe bit her cheek to stop herself from laughing. 'Well,' she said with her warmest smile, 'the refill is on the house. And dry cleaning too, I suppose.'",
                        emotion: "JOY",
                        confidence: 0.91
                    }
                ]
            },
            {
                title: "Recurring Nuisance",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "He came back the next morning. And the morning after that. Always the same order—double espresso, no sugar, no smile—and always the same seat by the window where he hammered away at his laptop like the fate of nations depended on it.",
                        emotion: "NEUTRAL",
                        confidence: 0.68
                    },
                    {
                        text: "On the fourth day, without looking up from his screen, he said: 'Your playlist is terrible.' Chloe turned to face him, eyebrow raised. 'The wifi password is CoffeeIsLove. Feel free to leave.' He almost smiled. Almost.",
                        emotion: "JOY",
                        confidence: 0.87
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 8 — Code of the Samurai (Action / Drama)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "Code of the Samurai",
        "A historical drama set in feudal Japan, chronicling a wandering warrior's quest to defend an innocent village from a corrupt warlord.",
        "https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Action", "Drama"],
        [
            {
                title: "The Ronin's Honor",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "Kenji stood at the edge of the bamboo forest, one hand resting on the worn hilt of his katana. He had sworn an oath of peace and meant to keep it. But the screams from the village carried on the wind, and oaths bowed before suffering.",
                        emotion: "SADNESS",
                        confidence: 0.81
                    },
                    {
                        text: "He stepped into the open road as the warlord's soldiers formed a semicircle around him. There were twelve. He counted them the way a carpenter counts nails—without fear, simply assessing the work ahead.",
                        emotion: "NEUTRAL",
                        confidence: 0.70
                    }
                ]
            },
            {
                title: "Blood on the Cherry Blossoms",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The battle was brief and terrible. When it was over, Kenji knelt in the mud, chest heaving, and looked at the petals drifting down from the old cherry tree overhead—pink against the grey sky, utterly indifferent to what had happened beneath them.",
                        emotion: "SADNESS",
                        confidence: 0.85
                    },
                    {
                        text: "The village elder placed a rough, warm hand on his shoulder. 'You saved us,' she said. Kenji shook his head. 'I only delayed what I cannot stop alone.' He stood, sheathed his blade, and looked toward the mountains. There was more work to do.",
                        emotion: "NEUTRAL",
                        confidence: 0.66
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 9 — The Alchemist's Secret (Mystery / Fantasy)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "The Alchemist's Secret",
        "A young apprentice discovers a forbidden formula that can turn lead to gold, but realises it comes with a terrible price that threatens the fabric of time itself.",
        "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Mystery", "Fantasy"],
        [
            {
                title: "The Hidden Lab",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "Master Valerius had always said: 'The obsidian cabinet is not locked to keep things in, Nicholas. It is locked to keep you safe.' But Valerius was gone, and the kingdom was burning, and Nicholas was desperate.",
                        emotion: "FEAR",
                        confidence: 0.80
                    },
                    {
                        text: "He opened the lock with a hairpin—something the master had never taught him but life had. The pages inside glowed with a cold blue luminescence, each line etched in a language older than the kingdom. The Transmutation Code of the Ancients.",
                        emotion: "SURPRISE",
                        confidence: 0.90
                    }
                ]
            },
            {
                title: "The Price of Gold",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The formula worked. Lead became gold beneath his hands, and the golden weight of it was heavier than he had expected. But when he looked in the mirror, the grey streak in his hair—he was only seventeen—told him what it had cost.",
                        emotion: "SADNESS",
                        confidence: 0.84
                    },
                    {
                        text: "He understood then what his master had sacrificed to protect him: not just knowledge, but years. Decades. Valerius had used the formula before, and it had aged him beyond recognition. Nicholas closed the cabinet and wept.",
                        emotion: "SADNESS",
                        confidence: 0.92
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 10 — A Crimson Heart (Drama / Romance)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "A Crimson Heart",
        "A gripping tale of royalty, betrayal, and passion, where a young duchess must choose between her duty to the crown and her forbidden love for a rebel leader.",
        "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Drama", "Romance"],
        [
            {
                title: "The Masquerade",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The ballroom was a sea of velvet and gold, chandeliers blazing overhead like captive suns. Beatrice played her part flawlessly—smiling, nodding, demure—while her eyes searched the room for the one face she was not supposed to want to find.",
                        emotion: "LOVE",
                        confidence: 0.88
                    },
                    {
                        text: "He wore the rebel insignia hidden on his cuff—a crimson thread, barely visible. He pulled her into the dark gardens without a word. 'You shouldn't be here, Your Grace,' he murmured into her hair. 'And you,' she replied, 'shouldn't make it so worth it.'",
                        emotion: "LOVE",
                        confidence: 0.95
                    }
                ]
            },
            {
                title: "The Ultimatum",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The King's summons arrived at dawn. Beatrice unfolded the letter with hands that did not tremble—she had trained them not to. The message was clear: renounce the rebel and accept Lord Harven's proposal by nightfall, or face treason charges.",
                        emotion: "ANGER",
                        confidence: 0.87
                    },
                    {
                        text: "She burned the letter in her fireplace and watched the ash curl upward. Then she dressed in her riding clothes—not her court gown—and called for her horse. If they wanted her obedience, they would have to earn it.",
                        emotion: "ANGER",
                        confidence: 0.82
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 11 — Beneath the Ice (Horror / Action)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "Beneath the Ice",
        "A research team in Antarctica drills deep into the ice cap, only to unleash a dormant, prehistoric parasite that turns the scientists against one another.",
        "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1516979187457-637abb4f9353?q=80&w=1200&auto=format&fit=crop",
        true,
        ["Horror", "Action"],
        [
            {
                title: "Deep Core 4",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The drill bit broke through the bottom layer at 3:14 a.m., and steam erupted from the shaft with a sound like a wounded animal. Dr. Foster peered into the darkness below, expecting geothermal heat. Instead, he saw green light.",
                        emotion: "SURPRISE",
                        confidence: 0.88
                    },
                    {
                        text: "Within an hour, the comms went dead. The generator still ran, the lights still burned, but from the outpost's darkest corner a shadow peeled itself free from the wall and moved toward Dr. Foster's bunk—clicking, patiently, in the sub-zero cold.",
                        emotion: "FEAR",
                        confidence: 0.94
                    }
                ]
            },
            {
                title: "Infected",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "By morning, Yuen was different. He sat at the breakfast table smiling at nothing, spooning oatmeal he never ate, his eyes fixed on a point three feet behind Foster's head. When Foster spoke his name, Yuen turned—and the smile widened past human range.",
                        emotion: "DISGUST",
                        confidence: 0.91
                    },
                    {
                        text: "Foster locked himself in the equipment room with a flare gun, a radio that no longer worked, and the terrible, growing certainty that he was the only one left. He had come to Antarctica to make history. Now he just wanted to survive it.",
                        emotion: "FEAR",
                        confidence: 0.89
                    }
                ]
            }
        ]
    );

    // ════════════════════════════════════════════════════════════════
    //  NOVEL 12 — The Galactic Frontier (Sci-Fi / Adventure)
    // ════════════════════════════════════════════════════════════════
    await createNovel(
        "The Galactic Frontier",
        "A space western following a ragtag crew of bounty hunters on the edge of the galaxy, tasked with rescuing a mysterious child who can bend reality with a thought.",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop",
        false,
        ["Sci-Fi", "Adventure"],
        [
            {
                title: "High Noon on Nova 7",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "Silas adjusted the holster of his plasma blaster, the twin suns of Nova 7 hammering down on the red dust of the outpost. The bounty was worth three years' pay. He told himself that was the only reason he had taken the job.",
                        emotion: "NEUTRAL",
                        confidence: 0.69
                    },
                    {
                        text: "He kicked open the saloon's swinging doors. The child sat on the bar counter, barely six years old, making a cup of metal bolts float in lazy circles with a casual wave of one small hand. Every adult in the room was pressed against the walls, paralysed by awe.",
                        emotion: "SURPRISE",
                        confidence: 0.93
                    }
                ]
            },
            {
                title: "The Child and the Void",
                status: "PUBLISHED",
                slides: [
                    {
                        text: "The child—who refused to give a name—watched Silas with eyes too old for that face. 'You're going to try to take me somewhere,' she said. It wasn't a question. 'That's the job,' he replied. She tilted her head. 'Then you'll need to be faster than the last twelve.'",
                        emotion: "SURPRISE",
                        confidence: 0.85
                    },
                    {
                        text: "By the time they reached the ship, Silas had come to a realisation he hadn't expected: he liked her. And that was going to be a problem, because whoever had hired him almost certainly didn't mean her well.",
                        emotion: "LOVE",
                        confidence: 0.77
                    }
                ]
            }
        ]
    );

    // ── Ratings ──────────────────────────────────────────────────────────────
    await prisma.rating.create({ data: { user_id: reader.id, novel_id: novel1.id, score: 5 } });
    await prisma.rating.create({ data: { user_id: reader.id, novel_id: novel2.id, score: 4 } });

    // ── Comment ───────────────────────────────────────────────────────────────
    const chapter1 = await prisma.chapter.findFirst({ where: { novel_id: novel1.id, order_index: 1 } });
    if (chapter1) {
        await prisma.comment.create({
            data: {
                user_id: reader.id,
                chapter_id: chapter1.id,
                content: "What a thrilling opener! The moment the voice came through the static gave me chills."
            }
        });
    }

    console.log("\n Seeding finished.");
    console.log("─────────────────────────────────────────");
    console.log("  Test Accounts  (Password: Password123!)");
    console.log("  Reader : reader@novelsive.com");
    console.log("  Author : author@novelsive.com");
    console.log("  Admin  : admin@novelsive.com");
    console.log("─────────────────────────────────────────\n");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
