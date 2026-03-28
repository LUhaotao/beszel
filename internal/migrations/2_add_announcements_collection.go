package migrations

import (
	"database/sql"
	"errors"

	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

const globalAnnouncementKey = "global"

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("announcements")
		if err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return err
			}

			collection = core.NewBaseCollection("announcements")
			collection.Fields.Add(
				&core.TextField{
					Name:     "key",
					Required: true,
					Max:      64,
				},
				&core.TextField{
					Name: "content",
					Max:  4000,
				},
			)
			collection.AddIndex("idx_announcements_key", true, "key", "")

			if err := app.Save(collection); err != nil {
				return err
			}
		} else {
			if collection.Fields.GetByName("key") == nil {
				collection.Fields.Add(&core.TextField{
					Name:     "key",
					Required: true,
					Max:      64,
				})
			}
			if collection.Fields.GetByName("content") == nil {
				collection.Fields.Add(&core.TextField{
					Name: "content",
					Max:  4000,
				})
			}
			if collection.GetIndex("idx_announcements_key") == "" {
				collection.AddIndex("idx_announcements_key", true, "key", "")
			}

			if err := app.Save(collection); err != nil {
				return err
			}
		}

		if _, err := app.FindFirstRecordByFilter("announcements", "key={:key}", dbx.Params{"key": globalAnnouncementKey}); err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				return err
			}

			record := core.NewRecord(collection)
			record.Set("key", globalAnnouncementKey)
			record.Set("content", "")

			if err := app.Save(record); err != nil {
				return err
			}
		}

		return nil
	}, nil)
}
