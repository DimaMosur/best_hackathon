from django import forms
from .models import Review, Place

class PlaceForm(forms.ModelForm):
    class Meta:
        model = Place
        fields = ['name', 'description',
                  'has_ramp', 'has_tactile_elements',
                  'has_adapted_toilet', 'has_comfortable_exit', "accessibility_score"
                  ]
        widgets = {
            'description': forms.Textarea(attrs={'rows': 3}),
        }

class ReviewForm(forms.ModelForm):
    class Meta:
        model = Review
        fields = ['rating', 'comment']
        widgets = {'comment': forms.Textarea(attrs={'rows': 3})}