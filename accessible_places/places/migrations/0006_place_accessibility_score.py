# Generated by Django 5.2 on 2025-04-12 19:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("places", "0005_rename_has_comfortable_exits_place_has_comfortable_exit"),
    ]

    operations = [
        migrations.AddField(
            model_name="place",
            name="accessibility_score",
            field=models.IntegerField(default=0),
        ),
    ]
