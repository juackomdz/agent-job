import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { CvProfile } from '#shared/cvSchema'
import { cvProfiles, cvSkills } from '../drizzle/schema'
import { useDb } from '../drizzle/db'

export async function saveCvProfile(profile: CvProfile) {
    const db = useDb()
    const id = randomUUID()
    const skills = [...new Set(profile.skills.map((s) => s.trim().toLowerCase()).filter(Boolean))]

    // better-sqlite3 es síncrono: el callback de la transacción no es async
    db.transaction((tx) => {
        tx.insert(cvProfiles)
            .values({
                id,
                fullName: profile.fullName,
                email: profile.email,
                headline: profile.headline,
                location: profile.location,
                data: profile,
            })
            .run()

        if (skills.length) {
            tx.insert(cvSkills).values(skills.map((skill) => ({ profileId: id, skill }))).run()
        }
    })

    return id
}

export async function getCvProfile(id: string) {
    return useDb().select().from(cvProfiles).where(eq(cvProfiles.id, id)).get()
}