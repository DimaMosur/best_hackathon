# Generated by Django 5.2 on 2025-04-13 16:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("places", "0006_place_accessibility_score"),
    ]

    operations = [
        migrations.AddField(
            model_name="place",
            name="proposals",
            field=models.TextField(blank=True, null=True),
        ),
    ]
