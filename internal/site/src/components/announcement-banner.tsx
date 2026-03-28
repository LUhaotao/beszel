import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { LoaderCircleIcon, PencilIcon, SaveIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { pb } from "@/lib/api"
import type { AnnouncementRecord } from "@/types"
import { Button } from "./ui/button"
import { Card } from "./ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog"
import { Textarea } from "./ui/textarea"
import { toast } from "./ui/use-toast"

const ANNOUNCEMENT_KEY = "global"
const ANNOUNCEMENT_FIELDS = "id,key,content,created,updated"

export function AnnouncementBanner() {
	const [announcement, setAnnouncement] = useState<AnnouncementRecord | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [draft, setDraft] = useState("")
	const [isSaving, setIsSaving] = useState(false)
	const dialogOpenRef = useRef(false)

	useEffect(() => {
		dialogOpenRef.current = dialogOpen
	}, [dialogOpen])

	useEffect(() => {
		let unsubscribe: (() => void) | undefined

		const loadAnnouncement = async () => {
			try {
				const record = await pb
					.collection<AnnouncementRecord>("announcements")
					.getFirstListItem(`key="${ANNOUNCEMENT_KEY}"`, { fields: ANNOUNCEMENT_FIELDS })
				setAnnouncement(record)
				if (!dialogOpenRef.current) {
					setDraft(record.content ?? "")
				}
			} catch {
				setAnnouncement(null)
				if (!dialogOpenRef.current) {
					setDraft("")
				}
			}
		}

		loadAnnouncement()

		;(async () => {
			unsubscribe = await pb.collection("announcements").subscribe(
				"*",
				(event) => {
					const record = event.record as AnnouncementRecord

					if (event.action === "delete") {
						setAnnouncement((current) => {
							if (current?.id !== record.id) {
								return current
							}
							if (!dialogOpenRef.current) {
								setDraft("")
							}
							return null
						})
						return
					}

					if (record.key !== ANNOUNCEMENT_KEY) {
						return
					}

					setAnnouncement(record)
					if (!dialogOpenRef.current) {
						setDraft(record.content ?? "")
					}
				},
				{ fields: ANNOUNCEMENT_FIELDS }
			)
		})()

		return () => unsubscribe?.()
	}, [])

	const handleOpenChange = (open: boolean) => {
		setDialogOpen(open)
		if (open) {
			setDraft(announcement?.content ?? "")
		}
	}

	const handleSave = async () => {
		setIsSaving(true)
		const content = draft.trim()

		try {
			if (announcement) {
				const updated = await pb.collection<AnnouncementRecord>("announcements").update(announcement.id, {
					content,
				})
				setAnnouncement(updated)
			} else {
				const created = await pb.collection<AnnouncementRecord>("announcements").create({
					key: ANNOUNCEMENT_KEY,
					content,
				})
				setAnnouncement(created)
			}

			setDialogOpen(false)
			toast({
				title: t`Announcement saved`,
				description: t`The announcement is now visible to all users.`,
			})
		} catch (error) {
			toast({
				variant: "destructive",
				title: t`Failed to save announcement`,
				description: (error as Error).message || t`Check logs for more details.`,
			})
		} finally {
			setIsSaving(false)
		}
	}

	const announcementText = announcement?.content?.trim()

	return (
		<>
			<Card className="overflow-hidden">
				<div className="flex items-start gap-4 p-4 sm:p-5">
					<div className="min-w-0 flex-1 break-words whitespace-pre-wrap text-sm leading-6">
						{announcementText || <Trans>There are currently no announcements.</Trans>}
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="shrink-0"
						onClick={() => handleOpenChange(true)}
					>
						<PencilIcon className="me-1.5 size-4" />
						<Trans>Edit</Trans>
					</Button>
				</div>
			</Card>

			<Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
				<DialogContent style={{ width: "92%", maxWidth: 720 }}>
					<DialogHeader>
						<DialogTitle>
							<Trans>Edit announcement</Trans>
						</DialogTitle>
						<DialogDescription>
							<Trans>This message will be visible to all users.</Trans>
						</DialogDescription>
					</DialogHeader>
					<Textarea
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						className="min-h-32"
						placeholder={t`Write an announcement...`}
					/>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
							<Trans>Cancel</Trans>
						</Button>
						<Button type="button" onClick={handleSave} disabled={isSaving}>
							{isSaving ? (
								<LoaderCircleIcon className="me-1.5 size-4 animate-spin" />
							) : (
								<SaveIcon className="me-1.5 size-4" />
							)}
							<Trans>Save</Trans>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
