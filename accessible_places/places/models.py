from django.db import models
from django.contrib.auth.models import User



class Place(models.Model):
    name = models.CharField(max_length=225)
    latitude = models.FloatField()
    longitude = models.FloatField()
    description = models.TextField(blank=True)
    has_ramp = models.BooleanField(default=False)
    has_tactile_elements = models.BooleanField(default=False)
    has_adapted_toilet = models.BooleanField(default=False)

    def average_rating(self):
        ratings = [review.rating for review in self.reviews.all()]
        return sum(ratings) / len(ratings) if ratings else 0

class Review(models.Model):
    place = models.ForeignKey(Place, on_delete=models.CASCADE, related_name='reviews')
    rating = models.FloatField()
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)