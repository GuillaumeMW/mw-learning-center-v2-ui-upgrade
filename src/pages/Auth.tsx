import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, GraduationCap, Mail, Lock, User, MapPin, Briefcase, Phone, Globe } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AuthPageProps {
  defaultTab?: 'login' | 'signup';
}

const AuthPage = ({ defaultTab = 'login' }: AuthPageProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneNumberError, setPhoneNumberError] = useState('');
  const [postalCodeError, setPostalCodeError] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [provinceState, setProvinceState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('Canada');
  const [employmentStatus, setEmploymentStatus] = useState<'employed' | 'self_employed' | 'student' | 'unemployed' | 'other'>('other');
  const [occupation, setOccupation] = useState('None of the Above – Other');
  const [serviceRegions, setServiceRegions] = useState('');
  const [languagesSpoken, setLanguagesSpoken] = useState('');

  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  // Province/State options
  const canadianProvinces = [
    'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'
  ];

  const usStates = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];

  // Phone number validation and formatting
  const validatePhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check if it's exactly 10 digits (US/Canada format)
    if (digitsOnly.length === 10) {
      return true;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // Accept 11 digits if it starts with 1 (country code)
      return true;
    }
    return false;
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Format as XXX-XXX-XXXX
    if (digitsOnly.length <= 3) {
      return digitsOnly;
    } else if (digitsOnly.length <= 6) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3)}`;
    } else if (digitsOnly.length <= 10) {
      return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // Format as 1-XXX-XXX-XXXX for 11 digits starting with 1
      return `1-${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
    }
    
    // Limit to 10 digits for other cases
    const limitedDigits = digitsOnly.slice(0, 10);
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else if (limitedDigits.length <= 6) {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3)}`;
    } else {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    setPhoneNumber(formatted);
    
    // Validate and set error
    if (value.trim() === '') {
      setPhoneNumberError('');
    } else if (!validatePhoneNumber(value)) {
      setPhoneNumberError('Please enter a valid US/Canada phone number (XXX-XXX-XXXX)');
    } else {
      setPhoneNumberError('');
    }
  };

  // Postal/Zip code validation and formatting
  const isCanadianProvince = (provinceState: string) => {
    return canadianProvinces.includes(provinceState);
  };

  const validateCanadianPostalCode = (postalCode: string) => {
    // Canadian postal code format: A1A 1A1 or A1A1A1
    const pattern = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
    return pattern.test(postalCode);
  };

  const validateUSZipCode = (zipCode: string) => {
    // US zip code format: 12345 or 12345-1234
    const pattern = /^\d{5}(-\d{4})?$/;
    return pattern.test(zipCode);
  };

  const formatCanadianPostalCode = (postalCode: string) => {
    // Remove all non-alphanumeric characters and convert to uppercase
    const cleaned = postalCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    
    // Limit to 6 characters
    const limited = cleaned.slice(0, 6);
    return `${limited.slice(0, 3)} ${limited.slice(3)}`;
  };

  const formatUSZipCode = (zipCode: string) => {
    // Remove all non-digit characters
    const digitsOnly = zipCode.replace(/\D/g, '');
    
    if (digitsOnly.length <= 5) {
      return digitsOnly;
    } else if (digitsOnly.length <= 9) {
      return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5)}`;
    }
    
    // Limit to 9 digits
    const limited = digitsOnly.slice(0, 9);
    return `${limited.slice(0, 5)}-${limited.slice(5)}`;
  };

  const handlePostalCodeChange = (value: string) => {
    if (!provinceState) {
      setPostalCode(value);
      setPostalCodeError('');
      return;
    }

    const isCanadian = isCanadianProvince(provinceState);
    let formatted = value;
    
    if (isCanadian) {
      formatted = formatCanadianPostalCode(value);
    } else {
      formatted = formatUSZipCode(value);
    }
    
    setPostalCode(formatted);
    
    // Validate and set error
    if (value.trim() === '') {
      setPostalCodeError('');
    } else if (isCanadian && !validateCanadianPostalCode(value)) {
      setPostalCodeError('Please enter a valid Canadian postal code (A1A 1A1)');
    } else if (!isCanadian && !validateUSZipCode(value)) {
      setPostalCodeError('Please enter a valid US zip code (12345 or 12345-1234)');
    } else {
      setPostalCodeError('');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!firstName || !lastName) {
      setError('First name and last name are required');
      setLoading(false);
      return;
    }

    // Validate phone number if provided
    if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid US/Canada phone number (XXX-XXX-XXXX)');
      setLoading(false);
      return;
    }

    // Validate postal code if provided
    if (postalCode && provinceState) {
      const isCanadian = isCanadianProvince(provinceState);
      if (isCanadian && !validateCanadianPostalCode(postalCode)) {
        setError('Please enter a valid Canadian postal code (A1A 1A1)');
        setLoading(false);
        return;
      } else if (!isCanadian && !validateUSZipCode(postalCode)) {
        setError('Please enter a valid US zip code (12345 or 12345-1234)');
        setLoading(false);
        return;
      }
    }

    const { error } = await signUp(email, password, {
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      address_line1: addressLine1,
      address_line2: addressLine2,
      city: city,
      province_state: provinceState,
      postal_code: postalCode,
      country: country,
      employment_status: employmentStatus,
      occupation: occupation as any,
      service_regions: serviceRegions.split(',').map(s => s.trim()).filter(Boolean),
      languages_spoken: languagesSpoken.split(',').map(l => l.trim()).filter(Boolean),
    });

    if (error) {
      setError(error.message);
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Registration Successful!",
        description: "Please check your email to verify your account.",
      });
      setActiveTab('login');
    }

    setLoading(false);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhoneNumber('');
    setPhoneNumberError('');
    setPostalCodeError('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setProvinceState('');
    setPostalCode('');
    setCountry('Canada');
    setEmploymentStatus('other');
    setOccupation('None of the Above – Other');
    setServiceRegions('');
    setLanguagesSpoken('');
    setError(null);
  };

  const switchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    resetForm();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/20 to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-primary">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">MW Learning Center</h1>
          <p className="text-muted-foreground mt-2">
            {activeTab === 'login' ? 'Welcome back to your learning journey' : 'Start your relocation specialist journey'}
          </p>
        </div>

        <Card className="shadow-large border-0">
          <CardHeader className="space-y-1">
            <div className="flex border-b">
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'login'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchTab('signup')}
                className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'signup'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Sign Up
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupEmail">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signupPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Separator />

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phoneNumber"
                      placeholder="555-123-4567"
                      value={phoneNumber}
                      onChange={(e) => handlePhoneNumberChange(e.target.value)}
                      className={`pl-10 ${phoneNumberError ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {phoneNumberError && (
                    <p className="text-sm text-red-600">{phoneNumberError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Format: XXX-XXX-XXXX (US/Canada phone numbers only)
                  </p>
                </div>

                {/* Address Fields */}
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="Address Line 1"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="mb-2"
                  />
                  <Input
                    placeholder="Address Line 2 (Optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="mb-2"
                  />
                   <div className="grid grid-cols-2 gap-2 mb-2">
                     <Input
                       placeholder="City"
                       value={city}
                       onChange={(e) => setCity(e.target.value)}
                     />
                     <Select value={provinceState} onValueChange={setProvinceState}>
                       <SelectTrigger>
                         <SelectValue placeholder="Province/State" />
                       </SelectTrigger>
                       <SelectContent className="max-h-60 overflow-y-auto bg-background z-50">
                         <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">
                           Canadian Provinces
                         </div>
                         {canadianProvinces.map(province => (
                           <SelectItem key={province} value={province}>
                             {province}
                           </SelectItem>
                         ))}
                         <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1">
                           US States
                         </div>
                         {usStates.map(state => (
                           <SelectItem key={state} value={state}>
                             {state}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="grid grid-cols-2 gap-2">
                     <div className="space-y-1">
                       <Input
                         placeholder={provinceState && isCanadianProvince(provinceState) ? "A1A 1A1" : "12345"}
                         value={postalCode}
                         onChange={(e) => handlePostalCodeChange(e.target.value)}
                         className={postalCodeError ? 'border-red-500' : ''}
                       />
                       {postalCodeError && (
                         <p className="text-sm text-red-600">{postalCodeError}</p>
                       )}
                       {provinceState && (
                         <p className="text-xs text-muted-foreground">
                           {isCanadianProvince(provinceState) 
                             ? 'Format: A1A 1A1 (Canadian postal code)' 
                             : 'Format: 12345 or 12345-1234 (US zip code)'}
                         </p>
                       )}
                     </div>
                     <Input
                       placeholder="Country"
                       value={country}
                       onChange={(e) => setCountry(e.target.value)}
                     />
                   </div>
                </div>

                {/* Employment Status Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="employmentStatus">Current Employment Status</Label>
                  <Select value={employmentStatus} onValueChange={(value: typeof employmentStatus) => setEmploymentStatus(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employed">Employed</SelectItem>
                      <SelectItem value="self_employed">Self-Employed</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="unemployed">Unemployed</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Occupation Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="occupation">Current/Past Occupation</Label>
                  <Select value={occupation} onValueChange={setOccupation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select occupation" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {['Real Estate Agent', 'Mortgage Broker', 'Home Stager', 'Property Manager', 'Insurance Broker', 'Interior Designer', 'Professional Organizer', 'Concierge / Lifestyle Manager', 'Virtual Assistant', 'Customer Service Representative', 'Sales Representative', 'Freelancer / Self-Employed', 'Relocation Specialist / Retired Mover', 'Retired Professional', 'Student', 'Stay-at-Home Parent', 'Hospitality Worker (e.g., hotel, Airbnb host)', 'Event Planner', 'Social Worker / Community Support', 'Construction / Renovation Worker', 'None of the Above – Other'].map(occ => (
                        <SelectItem key={occ} value={occ}>
                          {occ}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Regions */}
                <div className="space-y-2">
                  <Label htmlFor="serviceRegions">Preferred Service Regions (comma-separated)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="serviceRegions"
                      placeholder="e.g., Montreal, Toronto, Vancouver"
                      value={serviceRegions}
                      onChange={(e) => setServiceRegions(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    List cities or regions where you plan to offer relocation services.
                  </p>
                </div>

                {/* Languages Spoken */}
                <div className="space-y-2">
                  <Label htmlFor="languagesSpoken">Languages Spoken (comma-separated)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="languagesSpoken"
                      placeholder="e.g., English, French, Spanish"
                      value={languagesSpoken}
                      onChange={(e) => setLanguagesSpoken(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    List all languages you are fluent in.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default AuthPage;