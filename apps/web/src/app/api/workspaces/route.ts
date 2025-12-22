import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDb, workspaces, workspaceMemberships } from '@hg-ppc/db'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()

    // Get workspaces the user is a member of
    const userWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        role: workspaceMemberships.role,
      })
      .from(workspaceMemberships)
      .innerJoin(workspaces, eq(workspaceMemberships.workspaceId, workspaces.id))
      .where(eq(workspaceMemberships.userId, session.user.id))

    return NextResponse.json({ workspaces: userWorkspaces })
  } catch (error) {
    console.error('Failed to fetch workspaces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, slug } = await request.json()

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    const db = getDb()

    // Create workspace
    const [newWorkspace] = await db
      .insert(workspaces)
      .values({ name, slug })
      .returning()

    // Add user as owner
    await db.insert(workspaceMemberships).values({
      userId: session.user.id,
      workspaceId: newWorkspace.id,
      role: 'owner',
    })

    return NextResponse.json({ workspace: newWorkspace }, { status: 201 })
  } catch (error) {
    console.error('Failed to create workspace:', error)
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    )
  }
}
